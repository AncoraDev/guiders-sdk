<?php
/**
 * Guiders Plugin Updater
 *
 * Handles automatic updates from GitHub releases with error protection
 *
 * @package GuidersWPPlugin
 * @since 1.0.0
 * @version 1.2.0 - Added robust error handling
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class GuidersUpdater {
    
    /**
     * GitHub repository information
     */
    private const GITHUB_REPO = 'AncoraDev/guiders-sdk';
    private const GITHUB_API_URL = 'https://api.github.com/repos/' . self::GITHUB_REPO . '/releases';
    
    /**
     * Plugin information
     */
    private $plugin_file;
    private $plugin_basename;
    private $plugin_data;
    private $update_transient_key;
    
    /**
     * Constructor with error protection
     */
    public function __construct() {
        try {
            $this->plugin_file = GUIDERS_WP_PLUGIN_PLUGIN_FILE;
            $this->plugin_basename = GUIDERS_WP_PLUGIN_PLUGIN_BASENAME;
            $this->update_transient_key = 'guiders_wp_plugin_update_check';

            $this->initHooks();
        } catch (Throwable $e) {
            error_log('[Guiders Updater] Error in constructor: ' . $e->getMessage());
            // Don't throw - allow plugin to continue without updater
        }
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function initHooks() {
        // Check for updates
        add_filter('pre_set_site_transient_update_plugins', array($this, 'checkForUpdate'));
        
        // Plugin information popup
        add_filter('plugins_api', array($this, 'pluginInfoPopup'), 10, 3);
        
        // After plugin update
        add_action('upgrader_process_complete', array($this, 'afterUpdate'), 10, 2);
        
        // Clear update transient when checking manually
        add_action('load-update-plugins.php', array($this, 'clearUpdateTransient'));
        add_action('load-plugins.php', array($this, 'clearUpdateTransient'));
    }
    
    /**
     * Clear the update transient when needed
     */
    public function clearUpdateTransient() {
        if (isset($_GET['force-check'])) {
            delete_transient($this->update_transient_key);
        }
    }
    
    /**
     * Check for plugin updates with error protection
     */
    public function checkForUpdate($transient) {
        try {
            if (empty($transient->checked)) {
                return $transient;
            }

            // Get plugin data (with safety check)
            if (!function_exists('get_plugin_data')) {
                $plugin_file = ABSPATH . 'wp-admin/includes/plugin.php';
                if (!file_exists($plugin_file)) {
                    error_log('[Guiders Updater] WordPress plugin.php not found');
                    return $transient;
                }
                require_once $plugin_file;
            }

            $this->plugin_data = get_plugin_data($this->plugin_file);

            // Validate plugin data
            if (!isset($this->plugin_data['Version'])) {
                error_log('[Guiders Updater] Could not read plugin version');
                return $transient;
            }

            $current_version = $this->plugin_data['Version'];
        
        // Check cached version info
        $version_info = get_transient($this->update_transient_key);
        
        if ($version_info === false) {
            $version_info = $this->getLatestVersionInfo();
            
            if ($version_info) {
                // Cache for 6 hours
                set_transient($this->update_transient_key, $version_info, 6 * HOUR_IN_SECONDS);
            }
        }
        
            // Compare versions
            if ($version_info && version_compare($current_version, $version_info['version'], '<')) {
                $transient->response[$this->plugin_basename] = (object) array(
                    'slug'          => dirname($this->plugin_basename),
                    'plugin'        => $this->plugin_basename,
                    'new_version'   => $version_info['version'],
                    'url'           => isset($this->plugin_data['PluginURI']) ? $this->plugin_data['PluginURI'] : '',
                    'package'       => $version_info['download_url'],
                    'tested'        => isset($version_info['tested']) ? $version_info['tested'] : '6.8',
                    'requires_php'  => isset($version_info['requires_php']) ? $version_info['requires_php'] : '7.4',
                    'compatibility' => new stdClass(),
                );

                // Log update available
                error_log(sprintf(
                    '[Guiders Plugin] Update available: %s -> %s',
                    $current_version,
                    $version_info['version']
                ));
            }

            return $transient;

        } catch (Throwable $e) {
            error_log('[Guiders Updater] Error checking for updates: ' . $e->getMessage());
            return $transient; // Return unmodified transient on error
        }
    }
    
    /**
     * Get latest version information from GitHub with robust error handling
     */
    private function getLatestVersionInfo() {
        try {
            $response = wp_remote_get(self::GITHUB_API_URL, array(
                'timeout' => 15,
                'headers' => array(
                    'Accept' => 'application/vnd.github+json',
                    'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
                )
            ));

            if (is_wp_error($response)) {
                error_log('[Guiders Plugin] Failed to check for updates: ' . $response->get_error_message());
                return false;
            }

            $body = wp_remote_retrieve_body($response);
            $releases = json_decode($body, true);

            if (!is_array($releases) || empty($releases)) {
                error_log('[Guiders Plugin] No releases found in GitHub API response');
                return false;
            }

            // Find the latest stable release (non-prerelease) - WITH SAFE ARRAY ACCESS
            $latest_release = null;
            foreach ($releases as $release) {
                // Safe array access - check keys exist before using
                if (!is_array($release)) {
                    continue;
                }

                $is_draft = isset($release['draft']) && $release['draft'];
                $is_prerelease = isset($release['prerelease']) && $release['prerelease'];

                if (!$is_draft && !$is_prerelease) {
                    $latest_release = $release;
                    break;
                }
            }

            if (!$latest_release) {
                error_log('[Guiders Plugin] No stable releases found');
                return false;
            }

            // Find the plugin ZIP asset - WITH SAFE ARRAY ACCESS
            $download_url = null;

            if (!isset($latest_release['assets']) || !is_array($latest_release['assets'])) {
                error_log('[Guiders Plugin] No assets found in release');
                return false;
            }

            foreach ($latest_release['assets'] as $asset) {
                if (!is_array($asset)) {
                    continue;
                }

                $asset_name = isset($asset['name']) ? $asset['name'] : '';
                $asset_url = isset($asset['browser_download_url']) ? $asset['browser_download_url'] : '';

                if ($asset_name && preg_match('/guiders-wp-plugin.*\.zip$/i', $asset_name)) {
                    $download_url = $asset_url;
                    break;
                }
            }

            if (!$download_url) {
                error_log('[Guiders Plugin] No plugin ZIP found in release assets');
                return false;
            }

            // Safe extraction of version
            $tag_name = isset($latest_release['tag_name']) ? $latest_release['tag_name'] : '';
            if (!$tag_name) {
                error_log('[Guiders Plugin] No tag_name found in release');
                return false;
            }

            $version = ltrim($tag_name, 'v');

            // Build return array with safe defaults
            return array(
                'version'      => $version,
                'download_url' => $download_url,
                'details_url'  => isset($latest_release['html_url']) ? $latest_release['html_url'] : '',
                'changelog'    => isset($latest_release['body']) ? $latest_release['body'] : '',
                'tested'       => '6.8',
                'requires_php' => '7.4'
            );

        } catch (Throwable $e) {
            error_log('[Guiders Plugin] Exception in getLatestVersionInfo: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Plugin information popup with error protection
     */
    public function pluginInfoPopup($result, $action, $args) {
        try {
            if ($action !== 'plugin_information') {
                return $result;
            }

            if (!isset($args->slug) || $args->slug !== dirname($this->plugin_basename)) {
                return $result;
            }

            $version_info = get_transient($this->update_transient_key);

            if (!$version_info) {
                $version_info = $this->getLatestVersionInfo();
            }

            if (!$version_info) {
                return $result;
            }

            // Safe access to plugin_data with defaults
            $plugin_name = isset($this->plugin_data['Name']) ? $this->plugin_data['Name'] : 'Guiders SDK';
            $author = isset($this->plugin_data['Author']) ? $this->plugin_data['Author'] : 'Guiders';
            $homepage = isset($this->plugin_data['PluginURI']) ? $this->plugin_data['PluginURI'] : '';
            $description = isset($this->plugin_data['Description']) ? $this->plugin_data['Description'] : '';

            return (object) array(
                'slug'          => dirname($this->plugin_basename),
                'plugin_name'   => $plugin_name,
                'version'       => $version_info['version'],
                'author'        => $author,
                'homepage'      => $homepage,
                'requires'      => '5.0',
                'tested'        => '6.8',
                'requires_php'  => '7.4',
                'downloaded'    => 0,
                'last_updated'  => date('Y-m-d'),
                'sections'      => array(
                    'description' => $description,
                    'changelog'   => isset($version_info['changelog']) ? $version_info['changelog'] : 'Ver cambios en GitHub'
                ),
                'download_link' => $version_info['download_url'],
            );

        } catch (Throwable $e) {
            error_log('[Guiders Updater] Error in pluginInfoPopup: ' . $e->getMessage());
            return $result;
        }
    }
    
    /**
     * Actions after plugin update
     */
    public function afterUpdate($upgrader_object, $options) {
        if ($options['action'] === 'update' && $options['type'] === 'plugin') {
            foreach ($options['plugins'] as $plugin) {
                if ($plugin === $this->plugin_basename) {
                    delete_transient($this->update_transient_key);
                    
                    // Log successful update
                    error_log(sprintf(
                        '[Guiders Plugin] Successfully updated to version %s',
                        GUIDERS_WP_PLUGIN_VERSION
                    ));
                    
                    break;
                }
            }
        }
    }
    
    /**
     * Force update check (for debugging)
     */
    public function forceUpdateCheck() {
        delete_transient($this->update_transient_key);
        wp_update_plugins();
    }
}