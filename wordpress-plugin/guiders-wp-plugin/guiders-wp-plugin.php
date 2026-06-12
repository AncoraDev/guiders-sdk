<?php
/**
 * Plugin Name: Guiders SDK
 * Plugin URI: https://github.com/RogerPugaRuiz/guiders-sdk
 * Description: Integra el SDK de Guiders para tracking inteligente, chat en vivo y notificaciones en tu sitio WordPress. Con detección heurística automática de elementos sin necesidad de modificar el HTML. Incluye banner de consentimiento GDPR integrado.
 * Version: 2.13.3
 * Author: Guiders
 * Author URI: https://guiders.ancoradual.com
 * License: ISC
 * Text Domain: guiders-wp-plugin
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GUIDERS_WP_PLUGIN_VERSION', '2.13.3');
define('GUIDERS_WP_PLUGIN_PLUGIN_FILE', __FILE__);
define('GUIDERS_WP_PLUGIN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GUIDERS_WP_PLUGIN_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GUIDERS_WP_PLUGIN_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main plugin class
 */
class GuidersWPPlugin {
    
    /**
     * Plugin instance
     * @var GuidersWPPlugin
     */
    private static $instance = null;
    
    /**
     * Get plugin instance
     */
    public static function getInstance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->init();
    }
    
    /**
     * Initialize plugin with error protection
     */
    private function init() {
        // Load dependencies (returns false if critical error)
        if (!$this->loadDependencies()) {
            return; // Exit early if error handler couldn't load
        }

        // Check if we can continue (error handler is available now)
        if (class_exists('Guiders_Error_Handler') && !Guiders_Error_Handler::isPluginFunctional()) {
            error_log('[Guiders Plugin] Plugin initialization aborted due to critical errors');
            return; // Exit early if critical files failed to load
        }

        // Initialize hooks (safe - no external dependencies)
        $this->initHooks();

        // Initialize admin components (with error protection)
        if (is_admin()) {
            // Safe instantiation - won't crash if class fails
            Guiders_Error_Handler::safeInstantiate('GuidersAdmin', false);
            Guiders_Error_Handler::safeInstantiate('GuidersUpdater', false);
        }

        // Initialize public components (with error protection)
        if (!is_admin()) {
            Guiders_Error_Handler::safeInstantiate('GuidersPublic', false);
        }
    }
    
    /**
     * Load plugin dependencies with error protection
     */
    private function loadDependencies() {
        // Load error handler FIRST (critical - must exist)
        $error_handler_file = GUIDERS_WP_PLUGIN_PLUGIN_DIR . 'includes/class-guiders-error-handler.php';

        if (!file_exists($error_handler_file)) {
            // Fallback: if error handler doesn't exist, log and show basic notice
            error_log('[Guiders Plugin] CRITICAL: Error handler file not found. Plugin cannot load safely.');
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>';
                echo '<strong>Guiders SDK Plugin Error:</strong> Archivos críticos del plugin no encontrados. ';
                echo 'Por favor reinstala el plugin. WordPress sigue funcionando normalmente.';
                echo '</p></div>';
            });
            return false;
        }

        require_once $error_handler_file;

        // Now use error handler for remaining files
        $files = array(
            'includes/class-guiders-admin.php' => false,    // Not critical - only affects admin
            'includes/class-guiders-public.php' => false,   // Not critical - only affects frontend
            'includes/class-guiders-updater.php' => false   // Not critical - only affects updates
        );

        foreach ($files as $file => $critical) {
            $full_path = GUIDERS_WP_PLUGIN_PLUGIN_DIR . $file;
            Guiders_Error_Handler::safeRequire($full_path, $critical);
        }

        return true;
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function initHooks() {
        // Activation hook
        register_activation_hook(__FILE__, array($this, 'activate'));
        
        // Deactivation hook
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Add settings link to plugin page
        add_filter('plugin_action_links_' . GUIDERS_WP_PLUGIN_PLUGIN_BASENAME, array($this, 'addSettingsLink'));
        
        // Load text domain
        add_action('plugins_loaded', array($this, 'loadTextDomain'));
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        if (!get_option('guiders_wp_plugin_settings')) {
            add_option('guiders_wp_plugin_settings', array(
                'api_key' => '',
                'enabled' => false,
                'environment' => 'production',
                'chat_enabled' => true,
                'tracking_enabled' => true,
                'heuristic_detection' => true,
                'confidence_threshold' => 0.7,
                'active_hours_enabled' => false,
                'active_hours_timezone' => '',
                'active_hours_ranges' => '[{"start":"09:00","end":"18:00"}]',
                'active_hours_fallback_message' => 'El chat no está disponible en este momento. Por favor, inténtalo más tarde durante nuestros horarios de atención.',
                // Tracking V2 settings
                'tracking_v2_enabled' => true,
                'tracking_v2_batch_size' => 500,
                'tracking_v2_flush_interval' => 5000,
                'tracking_v2_max_queue_size' => 10000,
                'tracking_v2_persist_queue' => true,
                'tracking_v2_bypass_consent' => false,
                // Presence & Typing Indicators settings
                'presence_enabled' => true,
                'presence_show_typing_indicator' => true,
                'presence_typing_debounce' => 300,
                'presence_typing_timeout' => 2000,
                'presence_polling_interval' => 30000,
                'presence_show_offline_banner' => true
            ));
        }
        
        // Create custom database tables if needed (for future features)
        $this->createTables();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up any scheduled events
        wp_clear_scheduled_hook('guiders_wp_plugin_cleanup');
    }
    
    /**
     * Create database tables
     */
    private function createTables() {
        global $wpdb;
        
        // Future: Create tables for storing analytics data locally if needed
        // For now, all data is sent to Guiders API
    }
    
    /**
     * Add settings link to plugin actions
     */
    public function addSettingsLink($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=guiders-settings') . '">' . __('Configuración', 'guiders-wp-plugin') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    /**
     * Load text domain for translations
     */
    public function loadTextDomain() {
        load_plugin_textdomain('guiders-wp-plugin', false, dirname(GUIDERS_WP_PLUGIN_PLUGIN_BASENAME) . '/languages');
    }
}

/**
 * Initialize plugin
 */
function guidersWPPlugin() {
    return GuidersWPPlugin::getInstance();
}

// Start the plugin
guidersWPPlugin();

/**
 * Uninstall hook
 */
register_uninstall_hook(__FILE__, 'guiders_wp_plugin_uninstall');

function guiders_wp_plugin_uninstall() {
    // Remove plugin options
    delete_option('guiders_wp_plugin_settings');
    
    // Remove any custom tables or data if created in future versions
}