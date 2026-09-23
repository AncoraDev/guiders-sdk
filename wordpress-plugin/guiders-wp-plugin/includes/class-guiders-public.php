<?php
/**
 * Public functionality for Guiders WP Plugin with error protection
 *
 * @since 1.0.0
 * @version 1.2.0 - Added error handling
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class GuidersPublic {

    /**
     * Plugin settings
     * @var array
     */
    private $settings;

    /**
     * Constructor with error protection
     */
    public function __construct() {
        try {
            $this->settings = get_option('guiders_wp_plugin_settings', array());
            $this->initHooks();
        } catch (Throwable $e) {
            error_log('[Guiders Public] Error in constructor: ' . $e->getMessage());
            // Don't throw - allow WordPress to continue without frontend functionality
        }
    }
    
    /**
     * Initialize public hooks
     */
    private function initHooks() {
        // Only load if plugin is enabled and API key is set
        if ($this->isPluginActive()) {
            // Enqueue scripts and styles
            add_action('wp_enqueue_scripts', array($this, 'enqueueAssets'));

            // Add SDK initialization script to footer
            add_action('wp_footer', array($this, 'addSDKScript'), 20);

            // Add preconnect headers for performance
            add_action('wp_head', array($this, 'addPreconnectHeaders'), 1);

            // Dark/light mode preview toggle (development only — never injected
            // in production because it overrides the host site's background and
            // would break the customer's design).
            $environment = isset($this->settings['environment']) ? $this->settings['environment'] : 'production';
            if ($environment === 'development' && current_user_can('manage_options')) {
                add_action('wp_footer', array($this, 'addDarkModeToggle'), 99);
            }
        }
    }

    /**
     * Check if plugin is active and properly configured
     */
    private function isPluginActive() {
        return !empty($this->settings['enabled']) && !empty($this->settings['api_key']);
    }
    
    /**
     * Enqueue scripts and styles with error protection
     */
    public function enqueueAssets() {
        try {
            $sdk_file = GUIDERS_WP_PLUGIN_PLUGIN_URL . 'assets/js/guiders-sdk.min.js';

            // Verify SDK file exists
            $sdk_file_path = GUIDERS_WP_PLUGIN_PLUGIN_DIR . 'assets/js/guiders-sdk.min.js';
            if (!file_exists($sdk_file_path)) {
                error_log('[Guiders Public] SDK file not found: ' . $sdk_file_path);
                // Don't enqueue if file doesn't exist
                return;
            }

            // Enqueue the Guiders SDK
            // 🔧 FIX v2.10.10: Cache busting con hash MD5 del archivo
            // Esto genera un hash único basado en el contenido del archivo,
            // garantizando que cualquier cambio en el SDK invalide la caché
            $file_hash = substr(md5_file($sdk_file_path), 0, 8);
            $file_version = GUIDERS_WP_PLUGIN_VERSION . '.' . $file_hash;
            wp_enqueue_script(
                'guiders-sdk',
                $sdk_file,
                array(),
                $file_version,
                true // Load in footer
            );

            // Add SDK configuration (exponer exactamente como GUIDERS_CONFIG porque el bundle lo busca con ese nombre)
            $config = $this->getSDKConfig();
            wp_localize_script('guiders-sdk', 'GUIDERS_CONFIG', $config);

            // Add inline styles for better chat appearance if needed
            $this->addInlineStyles();

        } catch (Throwable $e) {
            error_log('[Guiders Public] Error enqueuing assets: ' . $e->getMessage());
            // Continue without SDK - WordPress still works
        }
    }
    
    /**
     * Get SDK configuration
     */
    private function getSDKConfig() {
        $config = array(
            'apiKey' => $this->settings['api_key'],
            'environment' => isset($this->settings['environment']) ? $this->settings['environment'] : 'production',
            'features' => array(
                'chat' => true,
                'tracking' => isset($this->settings['tracking_enabled']) ? $this->settings['tracking_enabled'] : true,
                'heuristicDetection' => isset($this->settings['heuristic_detection']) ? $this->settings['heuristic_detection'] : true,
            ),
            'heuristicConfig' => array(
                'confidenceThreshold' => isset($this->settings['confidence_threshold']) ? floatval($this->settings['confidence_threshold']) : 0.7,
                'enabled' => isset($this->settings['heuristic_detection']) ? $this->settings['heuristic_detection'] : true,
                'fallbackToManual' => true
            ),
            'sessionTracking' => array(
                'enabled' => true,
                'heartbeatInterval' => 30000,
                'trackBackgroundTime' => false
            ),
            'wordpress' => array(
                'version' => get_bloginfo('version'),
                'theme' => get_template(),
                'isWooCommerce' => class_exists('WooCommerce'),
                'isEDD' => class_exists('Easy_Digital_Downloads'),
                'pageType' => $this->getPageType()
            ),
            'chatConsentMessage' => array('enabled' => false),
            'activeHours' => array('enabled' => false),
            'commercialAvailability' => array(
                'enabled' => true,
                'hideWhenUnavailable' => false,
                'showBadge' => true,
            ),
            'requireConsent' => false,
            'consentBanner' => array('enabled' => false),
            'autoFlush' => isset($this->settings['auto_flush']) ? $this->settings['auto_flush'] : true,
            'flushInterval' => isset($this->settings['flush_interval']) ? intval($this->settings['flush_interval']) : 5000,
            'trackingV2' => $this->getTrackingV2Config(),
            'presence' => $this->getPresenceConfig(),
            'autoOpenChatOnMessage' => true,
            'quickActions' => array('enabled' => false),
            'colorScheme' => 'system',
            'theme' => 'default',
        );

        // Add environment-specific endpoints
        if ($config['environment'] === 'development') {
            $config['endpoint'] = 'http://localhost:3000/api';
            $config['webSocketEndpoint'] = 'ws://localhost:3000';
        } else {
            // Endpoints producción actualizados a dominio (evita mixed-content y facilita TLS)
            $config['endpoint'] = 'https://guiders-api.ancoradual.com/api';
            $config['webSocketEndpoint'] = 'wss://guiders-api.ancoradual.com';
        }

    // Auto-init control configurable:
    //  - immediate/domready/delayed: dejamos que el bundle realice su auto init (no bloqueamos) o usamos nuestro script si se desea lógica adicional.
    //  - manual: bloqueamos auto-init interno del bundle y exponemos window.initGuiders() para que el usuario decida cuándo iniciar.
    $settings = get_option('guiders_wp_plugin_settings', array());
    $mode = isset($settings['auto_init_mode']) ? $settings['auto_init_mode'] : 'domready';
    $delay = isset($settings['auto_init_delay']) ? intval($settings['auto_init_delay']) : 500;
    $config['autoInitMode'] = $mode;
    $config['autoInitDelay'] = $delay;
    // 🔧 FIX: SIEMPRE establecer preventAutoInit=true porque WordPress maneja su propia inicialización
    // Esto evita que el SDK cree múltiples instancias de ChatUI (una del bundle y otra de WordPress)
    $config['preventAutoInit'] = true;
        
        return $config;
    }
    
    /**
     * Get current page type for better context
     */
    private function getPageType() {
        if (is_front_page()) {
            return 'home';
        } elseif (function_exists('is_shop') && (is_shop() || is_product_category() || is_product_tag())) {
            return 'ecommerce';
        } elseif (function_exists('is_product') && is_product()) {
            return 'product_detail';
        } elseif (function_exists('is_cart') && is_cart()) {
            return 'cart';
        } elseif (function_exists('is_checkout') && is_checkout()) {
            return 'checkout';
        } elseif (function_exists('is_account_page') && is_account_page()) {
            return 'account';
        } elseif ($this->isContactPage()) {
            return 'contact';
        } elseif (is_search()) {
            return 'search_results';
        } elseif (is_category() || is_tag() || is_archive()) {
            return 'archive';
        } elseif (is_single()) {
            return 'post_detail';
        } elseif (is_page()) {
            return 'page';
        }
        
        return 'unknown';
    }
    
    /**
     * Check if current page is a contact page
     */
    private function isContactPage() {
        global $post;
        
        if (!$post) {
            return false;
        }
        
        // Check common contact page slugs and titles
        $contact_indicators = array('contact', 'contacto', 'contact-us', 'contactanos', 'contactenos');
        
        return in_array($post->post_name, $contact_indicators) || 
               stripos($post->post_title, 'contact') !== false ||
               stripos($post->post_title, 'contacto') !== false;
    }
    
    /**
     * Add SDK initialization script
     */
    public function addSDKScript() {
        ?>
    <script type="text/javascript">
    (function() {
            // Wait for DOM to be ready
            function initGuiders() {
                if (typeof window.TrackingPixelSDK === 'undefined') {
                    // SDK not loaded yet, try again in a moment
                    setTimeout(initGuiders, 100);
                    return;
                }
                
                // Prevent multiple initializations
                if (window.guiders) {
                    return;
                }
                
                try {
                    // El bundle busca window.GUIDERS_CONFIG; mantenemos retrocompatibilidad con guidersConfig si existiera
                    var config = window.GUIDERS_CONFIG || window.guidersConfig || {};
                    
                    // Create SDK options
                    var sdkOptions = {
                        apiKey: config.apiKey,
                        requireConsent: false,
                        autoFlush: config.autoFlush !== undefined ? config.autoFlush : true,
                        flushInterval: config.flushInterval || 5000,
                        maxRetries: 2,
                        heuristicDetection: {
                            enabled: config.features.heuristicDetection,
                            config: config.heuristicConfig
                        },
                        sessionTracking: config.sessionTracking,
                        trackingV2: config.trackingV2
                    };

                    // Add chat position configuration if available
                    if (config.chatPosition) {
                        sdkOptions.chatPosition = config.chatPosition;
                    }

                    // Add mobile detection configuration if available
                    if (config.mobileDetection) {
                        sdkOptions.mobileDetection = config.mobileDetection;
                    }

                    // Add presence configuration if available
                    if (config.presence) {
                        sdkOptions.presence = config.presence;
                    }

                    // Add chat consent message configuration if available
                    if (config.chatConsentMessage) {
                        sdkOptions.chatConsentMessage = config.chatConsentMessage;
                    }

                    // Add auto-open chat on message configuration if available
                    if (config.autoOpenChatOnMessage !== undefined) {
                        sdkOptions.autoOpenChatOnMessage = config.autoOpenChatOnMessage;
                    }

                    // Add Quick Actions configuration if available
                    if (config.quickActions) {
                        sdkOptions.quickActions = config.quickActions;
                    }

                    // Add AI Config configuration if available (SDK uses 'ai' key)
                    if (config.aiConfig) {
                        sdkOptions.ai = config.aiConfig;
                    }

                    // Add design theme (default / carbon)
                    if (config.theme) {
                        sdkOptions.theme = config.theme;
                    }

                    // Add color-scheme override (dark / light / system)
                    if (config.colorScheme) {
                        sdkOptions.colorScheme = config.colorScheme;
                    }

                    // Asignar siempre endpoints explícitos (evita fallback a localhost y doble init)
                    if (config.endpoint) {
                        sdkOptions.endpoint = (config.endpoint + '').replace(/\/+$/,'');
                    }
                    if (config.webSocketEndpoint) {
                        sdkOptions.webSocketEndpoint = (config.webSocketEndpoint + '').replace(/\/+$/,'');
                    }
                    
                    function doInit() {
                        if (window.guiders) {
                            return; // safeguard
                        }

                        window.guiders = new window.TrackingPixelSDK(sdkOptions);
                        window.guiders.init().then(function() {

                            if (config.features.tracking) {
                                window.guiders.enableAutomaticTracking();
                            }
                            if (config.wordpress.isWooCommerce) {
                                addWooCommerceTracking();
                            }
                            window.guiders.trackEvent('page_view', {
                                page_type: config.wordpress.pageType,
                                theme: config.wordpress.theme,
                                wp_version: config.wordpress.version,
                                is_woocommerce: config.wordpress.isWooCommerce,
                                url: window.location.href,
                                title: document.title
                            });
                        }).catch(function(error) {
                        });
                    }

                    // Exponer inicializador manual público (idempotente)
                    if (typeof window.initGuiders === 'undefined') {
                        window.initGuiders = function(force) {
                            if (window.guiders && !force) {
                                return window.guiders;
                            }
                            if (force && window.guiders) {
                                try { if (window.guiders.cleanup) { window.guiders.cleanup(); } } catch(e) { /* noop */ }
                                window.guiders = undefined;
                            }
                            doInit();
                            return window.guiders;
                        };
                    }


                    switch(config.autoInitMode) {
                        case 'immediate':
                            doInit();
                            break;
                        case 'domready':
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', doInit);
                            } else {
                                doInit();
                            }
                            break;
                        case 'delayed':
                            var d = parseInt(config.autoInitDelay || 500, 10);
                            setTimeout(doInit, isNaN(d)?500:d);
                            break;
                        case 'manual':
                            // No auto init; el desarrollador puede llamar window.guiders = new TrackingPixelSDK(...)
                            break;
                        default:
                            // fallback domready
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', doInit);
                            } else { doInit(); }
                    }
                    
                } catch (error) {
                }
            }
            
            // Add WooCommerce-specific tracking
            function addWooCommerceTracking() {
                // Track add to cart via AJAX
                jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, button) {
                    if (window.guiders) {
                        var productId = button.attr('data-product_id');
                        var quantity = button.attr('data-quantity') || 1;
                        
                        window.guiders.trackEvent('add_to_cart', {
                            product_id: productId,
                            quantity: parseInt(quantity),
                            source: 'woocommerce_ajax'
                        });
                    }
                });
                
                // Track remove from cart
                jQuery(document.body).on('removed_from_cart', function(event, fragments, cart_hash) {
                    if (window.guiders) {
                        window.guiders.trackEvent('remove_from_cart', {
                            source: 'woocommerce_ajax'
                        });
                    }
                });
            }
            
            // Start initialization
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initGuiders);
            } else {
                initGuiders();
            }
        })();
        </script>
        <?php
    }
    
    /**
     * Add preconnect headers for better performance
     */
    public function addPreconnectHeaders() {
        $environment = isset($this->settings['environment']) ? $this->settings['environment'] : 'production';
        
        if ($environment === 'production') {
            echo '<link rel="preconnect" href="https://guiders.ancoradual.com" crossorigin>' . "\n";
            echo '<link rel="dns-prefetch" href="//guiders.ancoradual.com">' . "\n";
        }
    }
    
    /**
     * Add inline styles for better integration
     */
    private function addInlineStyles() {
        $custom_css = "
        /* Guiders SDK WordPress Integration Styles */
        #guiders-chat-container {
            z-index: 999999;
        }
        
        #guiders-chat-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000000;
        }
        
        /* Ensure compatibility with common WordPress themes */
        .guiders-overlay {
            z-index: 999998;
        }
        
        /* Hide chat on mobile if needed */
        @media (max-width: 768px) {
            .guiders-hide-mobile {
                display: none !important;
            }
        }
        ";
        
        wp_add_inline_style('guiders-sdk', $custom_css);
    }
    
    /**
     * Get current user data for personalization
     */
    public function getCurrentUserData() {
        $user_data = array();
        
        if (is_user_logged_in()) {
            $current_user = wp_get_current_user();
            $user_data = array(
                'id' => $current_user->ID,
                'email' => $current_user->user_email,
                'name' => $current_user->display_name,
                'role' => implode(', ', $current_user->roles)
            );
        }
        
        return $user_data;
    }

    /**
     * Get chat consent message configuration
     */
    private function getChatConsentMessageConfig() {
        $config = array(
            'enabled' => isset($this->settings['chat_consent_message_enabled']) ? $this->settings['chat_consent_message_enabled'] : false,
            'message' => isset($this->settings['chat_consent_message_text']) ? $this->settings['chat_consent_message_text'] : 'Al unirte al chat, confirmas que has leído y entiendes nuestra',
            'privacyPolicyUrl' => isset($this->settings['chat_consent_privacy_url']) ? $this->settings['chat_consent_privacy_url'] : '',
            'privacyPolicyText' => isset($this->settings['chat_consent_privacy_text']) ? $this->settings['chat_consent_privacy_text'] : 'Política de Privacidad',
            'cookiesPolicyUrl' => isset($this->settings['chat_consent_cookies_url']) ? $this->settings['chat_consent_cookies_url'] : '',
            'cookiesPolicyText' => isset($this->settings['chat_consent_cookies_text']) ? $this->settings['chat_consent_cookies_text'] : 'Política de Cookies',
            'showOnce' => isset($this->settings['chat_consent_show_once']) ? $this->settings['chat_consent_show_once'] : true
        );

        return $config;
    }

    /**
     * Get active hours configuration
     */
    private function getActiveHoursConfig() {
        $config = array(
            'enabled' => isset($this->settings['active_hours_enabled']) ? $this->settings['active_hours_enabled'] : false,
            'timezone' => isset($this->settings['active_hours_timezone']) ? $this->settings['active_hours_timezone'] : '',
            'fallbackMessage' => isset($this->settings['active_hours_fallback_message']) ? $this->settings['active_hours_fallback_message'] : '',
            'ranges' => array()
        );

        // Parse ranges from JSON
        if (!empty($this->settings['active_hours_ranges'])) {
            $ranges = json_decode($this->settings['active_hours_ranges'], true);
            if (is_array($ranges)) {
                $config['ranges'] = $ranges;
            }
        }

        // Add exclude weekends setting
        if (isset($this->settings['active_hours_exclude_weekends']) && $this->settings['active_hours_exclude_weekends']) {
            $config['excludeWeekends'] = true;
        }

        // Parse active days from JSON
        if (!empty($this->settings['active_hours_active_days'])) {
            $active_days = json_decode($this->settings['active_hours_active_days'], true);
            if (is_array($active_days) && count($active_days) > 0) {
                $config['activeDays'] = array_map('intval', $active_days);
            }
        }

        // Set default fallback message if empty
        if (empty($config['fallbackMessage'])) {
            $config['fallbackMessage'] = __('El chat no está disponible en este momento. Por favor, inténtalo más tarde durante nuestros horarios de atención.', 'guiders-wp-plugin');
        }

        return $config;
    }

    /**
     * Get consent banner configuration
     */
    private function getConsentBannerConfig() {
        // IMPORTANTE: El banner solo se muestra si requireConsent está activado
        // Si requireConsent: false, el SDK ignora la configuración del banner
        $requireConsent = isset($this->settings['require_consent']) ? $this->settings['require_consent'] : false;
        $bannerEnabled = isset($this->settings['consent_banner_enabled']) ? $this->settings['consent_banner_enabled'] : false;

        // El banner solo está "enabled" si AMBOS están activados
        $effectiveEnabled = $requireConsent && $bannerEnabled;

        $config = array(
            'enabled' => $effectiveEnabled,
            'style' => isset($this->settings['consent_banner_style']) ? $this->settings['consent_banner_style'] : 'bottom_bar',
            'text' => isset($this->settings['consent_banner_text']) ? $this->settings['consent_banner_text'] : '🍪 Usamos cookies para mejorar tu experiencia y proporcionar chat en vivo.',
            'acceptText' => isset($this->settings['consent_accept_text']) ? $this->settings['consent_accept_text'] : 'Aceptar Todo',
            'denyText' => isset($this->settings['consent_deny_text']) ? $this->settings['consent_deny_text'] : 'Rechazar',
            'preferencesText' => isset($this->settings['consent_preferences_text']) ? $this->settings['consent_preferences_text'] : 'Preferencias',
            'showPreferences' => isset($this->settings['consent_show_preferences']) ? $this->settings['consent_show_preferences'] : true,
            'colors' => array(
                'background' => isset($this->settings['consent_banner_bg_color']) ? $this->settings['consent_banner_bg_color'] : '#2c3e50',
                'text' => isset($this->settings['consent_banner_text_color']) ? $this->settings['consent_banner_text_color'] : '#ffffff',
                'acceptButton' => isset($this->settings['consent_accept_color']) ? $this->settings['consent_accept_color'] : '#27ae60',
                'denyButton' => isset($this->settings['consent_deny_color']) ? $this->settings['consent_deny_color'] : '#95a5a6',
                'preferencesButton' => isset($this->settings['consent_preferences_color']) ? $this->settings['consent_preferences_color'] : '#3498db'
            ),
            'position' => isset($this->settings['consent_banner_position']) ? $this->settings['consent_banner_position'] : 'bottom',
            'autoShow' => isset($this->settings['consent_auto_show']) ? $this->settings['consent_auto_show'] : true
        );

        return $config;
    }

    /**
     * Get chat position configuration
     */
    private function getChatPositionConfig() {
        // Get position data from settings (stored as JSON)
        $positionDataJson = isset($this->settings['chat_position_data']) ? $this->settings['chat_position_data'] : '{}';
        $positionData = json_decode($positionDataJson, true);

        // Return null if no valid data
        if (!is_array($positionData) || empty($positionData)) {
            return null;
        }

        // Extract desktop and mobile configs
        $desktop = isset($positionData['desktop']) ? $positionData['desktop'] : array();
        $mobile = isset($positionData['mobile']) ? $positionData['mobile'] : array();
        $mobileEnabled = isset($mobile['enabled']) ? $mobile['enabled'] : false;

        // Convert desktop config to SDK format
        $desktopConfig = $this->convertPositionToSDKFormat($desktop);

        // If mobile is not enabled or no desktop config, return simple config
        if (!$mobileEnabled || !$desktopConfig) {
            return $desktopConfig;
        }

        // Convert mobile config to SDK format
        $mobileConfig = $this->convertPositionToSDKFormat($mobile);

        // If mobile config exists, return device-specific format
        if ($mobileConfig) {
            return array(
                'default' => $desktopConfig,
                'mobile' => $mobileConfig
            );
        }

        // Fallback to desktop only
        return $desktopConfig;
    }

    /**
     * Convert WordPress position format to SDK format
     *
     * @param array $config Configuration from WordPress (with mode, preset, button, widget)
     * @return mixed Preset string or coordinates object, or null if invalid
     */
    private function convertPositionToSDKFormat($config) {
        if (!is_array($config) || empty($config)) {
            return null;
        }

        $mode = isset($config['mode']) ? $config['mode'] : 'basic';

        // Basic mode: return preset string (e.g., "bottom-right")
        if ($mode === 'basic' && !empty($config['preset'])) {
            return $config['preset'];
        }

        // Advanced mode: return coordinates object
        if ($mode === 'advanced') {
            $button = isset($config['button']) ? $config['button'] : array();
            $widget = isset($config['widget']) ? $config['widget'] : array();

            // Build coordinates object (only include non-empty values)
            $coordinates = array();

            // Button position
            if (!empty($button['top'])) $coordinates['top'] = $button['top'];
            if (!empty($button['bottom'])) $coordinates['bottom'] = $button['bottom'];
            if (!empty($button['left'])) $coordinates['left'] = $button['left'];
            if (!empty($button['right'])) $coordinates['right'] = $button['right'];

            // Widget position (prefixed with 'widget')
            if (!empty($widget['top'])) $coordinates['widgetTop'] = $widget['top'];
            if (!empty($widget['bottom'])) $coordinates['widgetBottom'] = $widget['bottom'];
            if (!empty($widget['left'])) $coordinates['widgetLeft'] = $widget['left'];
            if (!empty($widget['right'])) $coordinates['widgetRight'] = $widget['right'];

            // Return coordinates if we have at least some position data
            if (!empty($coordinates)) {
                return $coordinates;
            }
        }

        return null;
    }

    /**
     * Get mobile detection configuration
     *
     * @return array|null Mobile detection config or null if defaults should be used
     */
    private function getMobileDetectionConfig() {
        // Get mobile detection settings
        $breakpoint = isset($this->settings['mobile_breakpoint']) ? intval($this->settings['mobile_breakpoint']) : 768;
        $mode = isset($this->settings['mobile_detection_mode']) ? $this->settings['mobile_detection_mode'] : 'auto';
        $debug = isset($this->settings['mobile_detection_debug']) ? $this->settings['mobile_detection_debug'] : false;

        // Only return config if non-default values are set
        $config = array(
            'mode' => $mode,
            'breakpoint' => $breakpoint,
            'debug' => $debug
        );

        return $config;
    }

    /**
     * Get commercial availability configuration
     *
     * @return array Commercial availability config
     */
    private function getCommercialAvailabilityConfig() {
        $config = array(
            'enabled' => isset($this->settings['commercial_availability_enabled']) ? $this->settings['commercial_availability_enabled'] : false,
            'pollingInterval' => isset($this->settings['commercial_availability_polling']) ? intval($this->settings['commercial_availability_polling']) : 30,
            'showBadge' => isset($this->settings['commercial_availability_show_badge']) ? $this->settings['commercial_availability_show_badge'] : false,
            'debug' => false // Could be made configurable if needed
        );

        return $config;
    }

    /**
     * Get Tracking V2 configuration
     *
     * @return array Tracking V2 config
     */
    private function getTrackingV2Config() {
        $config = array(
            'enabled' => isset($this->settings['tracking_v2_enabled']) ? $this->settings['tracking_v2_enabled'] : true,
            'batchSize' => isset($this->settings['tracking_v2_batch_size']) ? intval($this->settings['tracking_v2_batch_size']) : 500,
            'flushInterval' => isset($this->settings['tracking_v2_flush_interval']) ? intval($this->settings['tracking_v2_flush_interval']) : 5000,
            'maxQueueSize' => isset($this->settings['tracking_v2_max_queue_size']) ? intval($this->settings['tracking_v2_max_queue_size']) : 10000,
            'persistQueue' => isset($this->settings['tracking_v2_persist_queue']) ? $this->settings['tracking_v2_persist_queue'] : true,
            'bypassConsent' => isset($this->settings['tracking_v2_bypass_consent']) ? $this->settings['tracking_v2_bypass_consent'] : false,
            'throttling' => array(
                'enabled' => isset($this->settings['tracking_v2_throttling_enabled']) ? $this->settings['tracking_v2_throttling_enabled'] : true,
                'rules' => array(
                    'SCROLL' => isset($this->settings['tracking_v2_throttle_scroll']) ? intval($this->settings['tracking_v2_throttle_scroll']) : 100,
                    'MOUSE_MOVE' => isset($this->settings['tracking_v2_throttle_mouse_move']) ? intval($this->settings['tracking_v2_throttle_mouse_move']) : 50,
                    'HOVER' => isset($this->settings['tracking_v2_throttle_hover']) ? intval($this->settings['tracking_v2_throttle_hover']) : 200,
                    'RESIZE' => isset($this->settings['tracking_v2_throttle_resize']) ? intval($this->settings['tracking_v2_throttle_resize']) : 300,
                    'MOUSE_ENTER' => isset($this->settings['tracking_v2_throttle_mouse_enter']) ? intval($this->settings['tracking_v2_throttle_mouse_enter']) : 150,
                    'MOUSE_LEAVE' => isset($this->settings['tracking_v2_throttle_mouse_leave']) ? intval($this->settings['tracking_v2_throttle_mouse_leave']) : 150
                ),
                'debug' => isset($this->settings['tracking_v2_throttling_debug']) ? $this->settings['tracking_v2_throttling_debug'] : false
            ),
            'aggregation' => array(
                'enabled' => isset($this->settings['tracking_v2_aggregation_enabled']) ? $this->settings['tracking_v2_aggregation_enabled'] : true,
                'windowMs' => isset($this->settings['tracking_v2_aggregation_window']) ? intval($this->settings['tracking_v2_aggregation_window']) : 1000,
                'maxBufferSize' => isset($this->settings['tracking_v2_aggregation_buffer_size']) ? intval($this->settings['tracking_v2_aggregation_buffer_size']) : 1000,
                'debug' => isset($this->settings['tracking_v2_aggregation_debug']) ? $this->settings['tracking_v2_aggregation_debug'] : false
            )
        );

        return $config;
    }

    /**
     * Get Presence & Typing Indicators configuration
     *
     * @return array Presence config
     */
    private function getPresenceConfig() {
        $config = array(
            'enabled' => isset($this->settings['presence_enabled']) ? $this->settings['presence_enabled'] : true,
            'showTypingIndicator' => isset($this->settings['presence_show_typing_indicator']) ? $this->settings['presence_show_typing_indicator'] : true,
            'typingDebounce' => isset($this->settings['presence_typing_debounce']) ? intval($this->settings['presence_typing_debounce']) : 300,
            'typingTimeout' => isset($this->settings['presence_typing_timeout']) ? intval($this->settings['presence_typing_timeout']) : 2000,
            'pollingInterval' => isset($this->settings['presence_polling_interval']) ? intval($this->settings['presence_polling_interval']) : 30000,
            'showOfflineBanner' => isset($this->settings['presence_show_offline_banner']) ? $this->settings['presence_show_offline_banner'] : true
        );

        return $config;
    }

    /**
     * Get Quick Actions configuration
     */
    private function getQuickActionsConfig() {
        $enabled = isset($this->settings['quick_actions_enabled']) ? $this->settings['quick_actions_enabled'] : false;

        if (!$enabled) {
            return array('enabled' => false);
        }

        $buttons_json = isset($this->settings['quick_actions_buttons']) ? $this->settings['quick_actions_buttons'] : '';
        $buttons_raw = !empty($buttons_json) ? json_decode($buttons_json, true) : array();

        // Transform buttons to SDK format
        $buttons = array();
        if (is_array($buttons_raw)) {
            foreach ($buttons_raw as $button) {
                $action = array('type' => $button['actionType'] ?? 'send_message');

                // Add payload based on action type
                if ($action['type'] === 'send_message' && !empty($button['payload'])) {
                    $action['payload'] = $button['payload'];
                } elseif ($action['type'] === 'open_url' && !empty($button['payload'])) {
                    $action['payload'] = $button['payload'];
                }
                // request_agent doesn't need payload

                $buttons[] = array(
                    'id' => $button['id'] ?? 'btn_' . count($buttons),
                    'label' => $button['label'] ?? '',
                    'emoji' => $button['emoji'] ?? '',
                    'action' => $action
                );
            }
        }

        $config = array(
            'enabled' => true,
            'welcomeMessage' => isset($this->settings['quick_actions_welcome_message'])
                ? $this->settings['quick_actions_welcome_message']
                : 'Te lee una persona, no un bot.',
            'showOnFirstOpen' => isset($this->settings['quick_actions_show_on_first_open'])
                ? (bool)$this->settings['quick_actions_show_on_first_open']
                : true,
            'showOnChatStart' => isset($this->settings['quick_actions_show_on_chat_start'])
                ? (bool)$this->settings['quick_actions_show_on_chat_start']
                : true,
            'buttons' => $buttons
        );

        return $config;
    }

    /**
     * Get AI Config configuration
     */
    private function getAIConfig() {
        $enabled = isset($this->settings['ai_enabled']) ? (bool)$this->settings['ai_enabled'] : true;

        // Si AI está deshabilitado, retornar config mínima
        if (!$enabled) {
            return array('enabled' => false);
        }

        return array(
            'enabled' => true,
            'showAIIndicator' => isset($this->settings['ai_show_indicator'])
                ? (bool)$this->settings['ai_show_indicator']
                : true,
            'aiSenderName' => isset($this->settings['ai_sender_name'])
                ? $this->settings['ai_sender_name']
                : 'Asistente IA',
            'showTypingIndicator' => isset($this->settings['ai_show_typing_indicator'])
                ? (bool)$this->settings['ai_show_typing_indicator']
                : true
        );
    }

    /**
     * Inject a floating dark/light mode preview toggle in the frontend.
     *
     * This is a developer/preview utility that lets you quickly switch the page
     * background between light and dark so you can see how the chat SDK looks
     * against each color scheme without changing the active WordPress theme.
     *
     * It reads and persists the preference in localStorage under the key
     * "guiders_preview_dark_mode" and applies/removes the class
     * "guiders-dark-preview" on <html>.  A small pill button fixed to the
     * bottom-left corner triggers the toggle (offset from the chat FAB on the
     * bottom-right).
     *
     * CSS variables used by the dark overlay are scoped under
     * html.guiders-dark-preview so they never bleed outside this feature.
     */
    public function addDarkModeToggle() {
        ?>
        <style id="guiders-dm-toggle-styles">
        /* ── Guiders dark-mode preview ─────────────────────────────────── */
        html.guiders-dark-preview,
        html.guiders-dark-preview body {
            background-color: #111 !important;
            color: #f5f5f5 !important;
        }
        html.guiders-dark-preview a { color: #93c5fd !important; }
        html.guiders-dark-preview h1,
        html.guiders-dark-preview h2,
        html.guiders-dark-preview h3,
        html.guiders-dark-preview h4,
        html.guiders-dark-preview h5,
        html.guiders-dark-preview h6 { color: #f9fafb !important; }
        html.guiders-dark-preview p,
        html.guiders-dark-preview li,
        html.guiders-dark-preview span { color: #e5e7eb !important; }
        /* darken typical WP content wrappers */
        html.guiders-dark-preview .site,
        html.guiders-dark-preview .site-header,
        html.guiders-dark-preview .site-footer,
        html.guiders-dark-preview #masthead,
        html.guiders-dark-preview #colophon,
        html.guiders-dark-preview #page,
        html.guiders-dark-preview .wp-site-blocks,
        html.guiders-dark-preview header,
        html.guiders-dark-preview footer,
        html.guiders-dark-preview nav,
        html.guiders-dark-preview main,
        html.guiders-dark-preview article,
        html.guiders-dark-preview section,
        html.guiders-dark-preview aside,
        html.guiders-dark-preview .entry-content,
        html.guiders-dark-preview .widget {
            background-color: #111 !important;
            color: inherit !important;
            border-color: #333 !important;
        }
        html.guiders-dark-preview input,
        html.guiders-dark-preview textarea,
        html.guiders-dark-preview select {
            background-color: #1f1f1f !important;
            color: #f5f5f5 !important;
            border-color: #444 !important;
        }
        html.guiders-dark-preview .has-white-background-color,
        html.guiders-dark-preview .wp-block-cover {
            background-color: #1a1a1a !important;
        }

        /* ── Toggle button ─────────────────────────────────────────────── */
        #guiders-dm-toggle {
            position: fixed;
            bottom: 24px;
            left: 24px;
            z-index: 2147483640;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 9999px;
            border: none;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            font-weight: 600;
            line-height: 1;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s;
            user-select: none;
            /* Light default */
            background: #1e293b;
            color: #f8fafc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
        #guiders-dm-toggle:hover {
            box-shadow: 0 4px 14px rgba(0,0,0,0.45);
            transform: translateY(-1px);
        }
        html.guiders-dark-preview #guiders-dm-toggle {
            background: #f1f5f9;
            color: #1e293b;
        }
        #guiders-dm-toggle .gdm-icon { font-size: 15px; line-height: 1; }
        #guiders-dm-toggle .gdm-label { white-space: nowrap; }

        /* small badge to signal "preview mode" */
        #guiders-dm-badge {
            position: fixed;
            bottom: 60px;
            left: 24px;
            z-index: 2147483640;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .04em;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: 4px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }
        html.guiders-dark-preview #guiders-dm-badge {
            opacity: 1;
            background: #334155;
            color: #94a3b8;
        }
        </style>

        <button id="guiders-dm-toggle" title="Toggle dark/light preview" aria-pressed="false">
            <span class="gdm-icon" aria-hidden="true">🌙</span>
            <span class="gdm-label">Dark preview</span>
        </button>
        <span id="guiders-dm-badge">Preview mode</span>

        <script id="guiders-dm-toggle-script">
        (function () {
            var STORAGE_KEY = 'guiders_preview_dark_mode';
            var html = document.documentElement;
            var btn  = document.getElementById('guiders-dm-toggle');
            var icon = btn.querySelector('.gdm-icon');
            var lbl  = btn.querySelector('.gdm-label');

            function isDark() {
                return html.classList.contains('guiders-dark-preview');
            }

            function applyState(dark, save) {
                if (dark) {
                    html.classList.add('guiders-dark-preview');
                    btn.setAttribute('aria-pressed', 'true');
                    icon.textContent = '☀️';
                    lbl.textContent  = 'Light preview';
                } else {
                    html.classList.remove('guiders-dark-preview');
                    btn.setAttribute('aria-pressed', 'false');
                    icon.textContent = '🌙';
                    lbl.textContent  = 'Dark preview';
                }
                if (save) {
                    try { localStorage.setItem(STORAGE_KEY, dark ? '1' : '0'); } catch(e) {}
                }
            }

            // Restore persisted preference
            try {
                var stored = localStorage.getItem(STORAGE_KEY);
                if (stored === '1') { applyState(true, false); }
            } catch(e) {}

            btn.addEventListener('click', function () {
                applyState(!isDark(), true);
            });
        })();
        </script>
        <?php
    }
}