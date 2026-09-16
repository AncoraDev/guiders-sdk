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
        // Register with WP Consent API (if available)
        $this->registerWithWPConsentAPI();

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
     * Register plugin with WP Consent API
     * This makes the plugin officially compatible with cookie consent plugins
     */
    private function registerWithWPConsentAPI() {
        // Register this plugin as WP Consent API compatible
        $plugin = plugin_basename(GUIDERS_WP_PLUGIN_PLUGIN_FILE);
        add_filter("wp_consent_api_registered_{$plugin}", '__return_true');
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
                'chat' => isset($this->settings['chat_enabled']) ? $this->settings['chat_enabled'] : true,
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
            'chatConsentMessage' => $this->getChatConsentMessageConfig(),
            'activeHours' => $this->getActiveHoursConfig(),
            'commercialAvailability' => $this->getCommercialAvailabilityConfig(),
            'requireConsent' => isset($this->settings['require_consent']) ? $this->settings['require_consent'] : false,
            'consentBanner' => $this->getConsentBannerConfig(),
            'chatPosition' => $this->getChatPositionConfig(),
            'mobileDetection' => $this->getMobileDetectionConfig(),
            'autoFlush' => isset($this->settings['auto_flush']) ? $this->settings['auto_flush'] : true,
            'flushInterval' => isset($this->settings['flush_interval']) ? intval($this->settings['flush_interval']) : 5000,
            'trackingV2' => $this->getTrackingV2Config(),
            'presence' => $this->getPresenceConfig(),
            'autoOpenChatOnMessage' => isset($this->settings['auto_open_chat_on_message']) ? (bool)$this->settings['auto_open_chat_on_message'] : true,
            'quickActions' => $this->getQuickActionsConfig(),
            'aiConfig' => $this->getAIConfig(),
            'chatSelector' => $this->getChatSelectorConfig(),
            // Color-scheme override (dark / light / system).
            // 'system' means "follow OS prefers-color-scheme" — omit the key to avoid
            // sending a redundant value; the SDK treats missing as 'system'.
            'colorScheme' => isset($this->settings['chat_color_scheme']) && in_array($this->settings['chat_color_scheme'], array('system', 'light', 'dark'), true)
                ? $this->settings['chat_color_scheme']
                : 'system',
            // Design theme (default / carbon).
            // Note: 'theme' top-level is the design-theme ThemeId — distinct from
            // 'wordpress.theme' (get_template()) in the sub-array above.
            'theme' => isset($this->settings['chat_theme']) && in_array($this->settings['chat_theme'], array('default', 'carbon'), true)
                ? $this->settings['chat_theme']
                : 'default',
        );

        // Add environment-specific endpoints
        if ($config['environment'] === 'development') {
            $config['endpoint'] = 'http://localhost:3000/api';
            $config['webSocketEndpoint'] = 'ws://localhost:3000';
        } else {
            // Endpoints producción actualizados a dominio (evita mixed-content y facilita TLS)
            $config['endpoint'] = 'https://guiders.es/api';
            $config['webSocketEndpoint'] = 'wss://guiders.es';
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
            // Configuración del sistema de cookies desde WordPress
            var cookieConfig = <?php echo json_encode(array(
                'system' => isset($this->settings['cookie_consent_system']) ? $this->settings['cookie_consent_system'] : 'auto',
                'wp_consent_api_enabled' => isset($this->settings['wp_consent_api_sync_enabled']) ? $this->settings['wp_consent_api_sync_enabled'] : true,
                'debug' => isset($this->settings['cookie_consent_debug']) ? $this->settings['cookie_consent_debug'] : false
            )); ?>;

            // Log de configuración (ejecutado inmediatamente al cargar el script)

            // Exponer para debugging
            window.guidersCookieConfig = cookieConfig;

            // WP Consent API Integration
            // Sincroniza el consentimiento del plugin de cookies con Guiders SDK
            // Retorna: true si detectó WP Consent API, false si no
            function setupConsentSync() {
                // Verificar si la sincronización está habilitada
                if (!cookieConfig.wp_consent_api_enabled) {
                    
                    return false;
                }

                // Verificar si se debe forzar el sistema interno
                if (cookieConfig.system === 'internal') {
                    
                    return false;
                }

                // Verificar si WP Consent API está disponible
                var hasWPConsentAPI = typeof wp_has_consent !== 'undefined' && typeof wp_set_consent !== 'undefined';

                if (!hasWPConsentAPI) {
                    if (cookieConfig.debug || cookieConfig.system === 'wp_consent_api') {
                    }
                    return false;
                }

                // Si el sistema es 'custom', no hacer nada (el usuario debe implementar su lógica)
                if (cookieConfig.system === 'custom') {
                    
                    return false;
                }

                

                // Mapeo de categorías: WP Consent API → Guiders SDK
                var categoryMap = {
                    'functional': 'functional',           // Cookies funcionales
                    'statistics': 'analytics',            // Estadísticas → Analytics
                    'marketing': 'personalization'        // Marketing → Personalización
                };

                // Función para sincronizar consentimiento inicial desde WP Consent API a Guiders
                function syncInitialConsent() {
                    if (!window.guiders || !window.guiders.grantConsentWithPreferences) {
                        
                        return;
                    }

                    var guidersConsent = {};
                    var hasAnyConsent = false;

                    // Leer estado de consentimiento de cada categoría
                    Object.keys(categoryMap).forEach(function(wpCategory) {
                        var guidersCategory = categoryMap[wpCategory];
                        var hasConsent = wp_has_consent(wpCategory);
                        guidersConsent[guidersCategory] = hasConsent;
                        if (hasConsent) hasAnyConsent = true;
                        
                    });

                    // Actualizar consentimiento en Guiders SDK
                    if (hasAnyConsent) {
                        window.guiders.grantConsentWithPreferences(guidersConsent);
                        
                    }
                }

                // Función para escuchar cambios de consentimiento en tiempo real
                function setupConsentChangeListener() {
                    // Escuchar cambios en cada categoría
                    Object.keys(categoryMap).forEach(function(wpCategory) {
                        var guidersCategory = categoryMap[wpCategory];

                        document.addEventListener('wp_listen_for_consent_change', function(event) {
                            if (!window.guiders || !window.guiders.grantConsentWithPreferences) return;

                            // Verificar si el cambio afecta a esta categoría
                            var newConsent = wp_has_consent(wpCategory);

                            // Actualizar Guiders con el nuevo estado
                            var update = {};
                            update[guidersCategory] = newConsent;
                            window.guiders.grantConsentWithPreferences(update);

                            
                        });
                    });

                    
                }

                // Ejecutar sincronización inicial y configurar listener
                syncInitialConsent();
                setupConsentChangeListener();

                return true; // WP Consent API detectada y configurada
            }

            // Moove GDPR Integration (GDPR Cookie Compliance)
            // Integración con el plugin "GDPR Cookie Compliance" de Moove
            // Retorna: true si detectó Moove GDPR, false si no
            function setupMooveGDPRSync() {
                // Verificar si debe sincronizarse
                if (!cookieConfig.wp_consent_api_enabled) {
                    
                    return false;
                }

                // Verificar si se debe forzar el sistema interno
                if (cookieConfig.system === 'internal') {
                    
                    return false;
                }

                // Verificar si Moove GDPR está presente
                var hasMooveGDPR = typeof moove_gdpr_popup !== 'undefined' || document.getElementById('moove_gdpr_cookie_modal') !== null;

                if (!hasMooveGDPR) {
                    if (cookieConfig.debug && cookieConfig.system === 'custom') {
                    }
                    return false;
                }

                

                // Función helper para leer cookies
                function getCookie(name) {
                    var nameEQ = name + "=";
                    var ca = document.cookie.split(';');
                    for(var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                    }
                    return null;
                }

                // Función para leer el consentimiento de Moove GDPR
                function readMooveConsent() {
                    // MÉTODO 1: Leer cookie moove_gdpr_popup (formato JSON)
                    // Configuración de 3 categorías: {"strict":"1","performance":"1","targeting":"1"}
                    // Configuración de 5 categorías: {"strict":"1","thirdparty":"1","advanced":"1","performance":"1","preference":"1"}
                    var cookieValue = getCookie('moove_gdpr_popup');

                    if (!cookieValue) {
                        
                        return null;
                    }

                    try {
                        // Decodificar URL encoding
                        var decoded = decodeURIComponent(cookieValue);
                        var cookieData = JSON.parse(decoded);

                        

                        // MAPEO FLEXIBLE: Detecta automáticamente si usa 3 o 5 categorías
                        //
                        // CATEGORÍAS COMUNES (3 categorías):
                        // - strict (strictly necessary) -> functional
                        // - performance (analytics) -> analytics
                        // - targeting/marketing -> personalization
                        //
                        // CATEGORÍAS EXTENDIDAS (5 categorías):
                        // - strict (strictly necessary) -> functional
                        // - performance (analytics) -> analytics
                        // - thirdparty (third party cookies) -> analytics
                        // - advanced (advanced/marketing) -> personalization
                        // - preference (user preferences) -> personalization

                        var consent = {
                            functional: cookieData.strict === '1',
                            analytics: false,
                            personalization: false
                        };

                        // Analytics: performance, thirdparty
                        if (cookieData.performance === '1') consent.analytics = true;
                        if (cookieData.thirdparty === '1') consent.analytics = true;

                        // Personalization: targeting, marketing, advanced, preference
                        if (cookieData.targeting === '1') consent.personalization = true;
                        if (cookieData.marketing === '1') consent.personalization = true;
                        if (cookieData.advanced === '1') consent.personalization = true;
                        if (cookieData.preference === '1') consent.personalization = true;

                        return consent;
                    } catch (e) {
                        
                    }

                    // MÉTODO 2 (FALLBACK): Leer localStorage (método antiguo)
                    var functional = localStorage.getItem('moove_gdpr_popup') === '1' ||
                                   localStorage.getItem('moove_gdpr_strict') === '1';
                    var analytics = localStorage.getItem('moove_gdpr_performance') === '1' ||
                                  localStorage.getItem('moove_gdpr_thirdparty') === '1';
                    var personalization = localStorage.getItem('moove_gdpr_targeting') === '1' ||
                                        localStorage.getItem('moove_gdpr_marketing') === '1' ||
                                        localStorage.getItem('moove_gdpr_advanced') === '1' ||
                                        localStorage.getItem('moove_gdpr_preference') === '1';

                    return {
                        functional: functional,
                        analytics: analytics,
                        personalization: personalization
                    };
                }

                // Función para sincronizar con Guiders SDK (con reintentos automáticos)
                var syncRetries = 0;
                var maxSyncRetries = 20; // 20 reintentos x 500ms = 10 segundos máximo

                function syncMooveToGuiders() {
                    if (!window.guiders || !window.guiders.grantConsentWithPreferences) {
                        if (syncRetries < maxSyncRetries) {
                            syncRetries++;
                            
                            setTimeout(syncMooveToGuiders, 500);
                        } else {
                        }
                        return;
                    }

                    var consent = readMooveConsent();

                    if (!consent) {
                        
                        return;
                    }


                    // Actualizar Guiders con el consentimiento usando el método correcto
                    window.guiders.grantConsentWithPreferences(consent);


                    // Resetear contador de reintentos para futuras sincronizaciones
                    syncRetries = 0;
                }

                // Escuchar el evento de cierre del modal de Moove
                document.addEventListener('moove_gdpr_modal_closed', function() {
                    setTimeout(syncMooveToGuiders, 100); // Pequeño delay para asegurar que la cookie esté actualizada
                });

                // Polling de cambios en cookie (fallback si no hay evento)
                var lastMooveConsent = getCookie('moove_gdpr_popup');
                setInterval(function() {
                    var currentConsent = getCookie('moove_gdpr_popup');
                    if (currentConsent !== lastMooveConsent) {
                        lastMooveConsent = currentConsent;
                        syncMooveToGuiders();
                    }
                }, 1000); // Verificar cada segundo

                // Sincronizar estado inicial
                syncMooveToGuiders();

                

                return true; // Moove GDPR detectado y configurado
            }

            // Beautiful Cookie Banner Integration
            // Integración con el plugin "Beautiful Cookie Banner" (basado en Osano Cookie Consent 3.1.0)
            // Retorna: true si detectó Beautiful Cookie Banner, false si no
            function setupBeautifulCookieBannerSync() {
                // Verificar si debe sincronizarse
                if (!cookieConfig.wp_consent_api_enabled) {
                    
                    return false;
                }

                // Verificar si se debe forzar el sistema interno
                if (cookieConfig.system === 'internal') {
                    
                    return false;
                }

                // Helper: Leer cookie por nombre
                function getCookie(name) {
                    var value = '; ' + document.cookie;
                    var parts = value.split('; ' + name + '=');
                    if (parts.length === 2) {
                        return parts.pop().split(';').shift();
                    }
                    return null;
                }

                // Detectar Beautiful Cookie Banner (cookie O elementos DOM)
                var hasBeautifulCookieBanner = document.cookie.indexOf('cookieconsent_status') !== -1 ||
                                              document.querySelector('.cc-window') !== null ||
                                              document.querySelector('.cc-banner') !== null;

                if (!hasBeautifulCookieBanner) {
                    
                    return false;
                }

                

                // Función para leer consentimiento de Beautiful Cookie Banner
                function readBeautifulCookieBannerConsent() {
                    var cookieValue = getCookie('cookieconsent_status');

                    if (!cookieValue) {
                        
                        return null;
                    }

                    

                    // Intentar parsear como JSON (modo diferenciado)
                    try {
                        var parsed = JSON.parse(decodeURIComponent(cookieValue));

                        // Modo diferenciado: {"tech":"true","analytics":"false","marketing":"true"}
                        if (typeof parsed === 'object' && parsed !== null) {
                            var consent = {
                                functional: parsed.tech === 'true' || parsed.tech === true,
                                analytics: parsed.analytics === 'true' || parsed.analytics === true,
                                personalization: parsed.marketing === 'true' || parsed.marketing === true
                            };

                            return consent;
                        }
                    } catch (e) {
                        // No es JSON, es modo simple
                    }

                    // Modo simple: "allow", "deny", "dismiss"
                    // Usar modo ESTRICTO (solo 'allow' = consentimiento)
                    var hasConsent = cookieValue === 'allow';


                    return {
                        functional: hasConsent,
                        analytics: hasConsent,
                        personalization: hasConsent
                    };
                }

                // Función para sincronizar con Guiders SDK (con reintentos automáticos)
                var syncRetries = 0;
                var maxSyncRetries = 20; // 20 reintentos x 500ms = 10 segundos máximo

                function syncBeautifulCookieBannerToGuiders() {
                    if (!window.guiders || !window.guiders.grantConsentWithPreferences) {
                        if (syncRetries < maxSyncRetries) {
                            syncRetries++;
                            
                            setTimeout(syncBeautifulCookieBannerToGuiders, 500);
                        } else {
                        }
                        return;
                    }

                    var consent = readBeautifulCookieBannerConsent();

                    if (!consent) {
                        
                        return;
                    }


                    // Actualizar Guiders con el consentimiento usando el método correcto
                    window.guiders.grantConsentWithPreferences(consent);


                    // Resetear contador de reintentos para futuras sincronizaciones
                    syncRetries = 0;
                }

                // Método 1: Escuchar eventos dataLayer (recomendado)
                if (typeof window.dataLayer !== 'undefined') {
                    var originalPush = window.dataLayer.push;
                    window.dataLayer.push = function() {
                        var args = Array.prototype.slice.call(arguments);
                        var data = args[0];

                        if (data && (data.event === 'beautiful_cookie_consent_updated' ||
                                    data.event === 'beautiful_cookie_consent_initialized')) {
                            
                            setTimeout(syncBeautifulCookieBannerToGuiders, 100);
                        }

                        return originalPush.apply(window.dataLayer, args);
                    };

                    
                }

                // Método 2: Polling de cambios en cookie (fallback)
                var lastConsent = getCookie('cookieconsent_status');
                setInterval(function() {
                    var currentConsent = getCookie('cookieconsent_status');
                    if (currentConsent !== lastConsent) {
                        lastConsent = currentConsent;
                        syncBeautifulCookieBannerToGuiders();
                    }
                }, 1000);

                // Sincronizar estado inicial
                setTimeout(syncBeautifulCookieBannerToGuiders, 500);

                

                return true; // Beautiful Cookie Banner detectado y configurado
            }

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

                    // Add Chat Selector configuration if available
                    if (config.chatSelector) {
                        sdkOptions.chatSelector = config.chatSelector;
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
                    
                    // ⚠️ IMPORTANTE: Sincronizar consentimiento INMEDIATAMENTE
                    // Debe ejecutarse ANTES de cualquier inicialización del SDK (incluso antes del delay)
                    // Si requireConsent=true, el SDK espera consentimiento para inicializarse

                    var hasWPConsent = setupConsentSync();
                    var hasMooveGDPR = setupMooveGDPRSync();
                    var hasBeautifulCookie = setupBeautifulCookieBannerSync();

                    // Resumen de detección (SIEMPRE mostrar, no requiere debug)
                    var detected = [];
                    if (hasWPConsent) detected.push('WP Consent API');
                    if (hasMooveGDPR) detected.push('Moove GDPR');
                    if (hasBeautifulCookie) detected.push('Beautiful Cookie Banner');

                    if (detected.length > 0) {

                        // ⚠️ IMPORTANTE: Si se detecta un gestor externo, FORZAR requireConsent=true
                        // Esto asegura que el chat no se muestre hasta que se otorgue consentimiento
                        if (!sdkOptions.requireConsent) {
                            sdkOptions.requireConsent = true;
                        }

                        // ⚠️ CRÍTICO: Limpiar localStorage del ConsentManager para que el SDK inicie con estado 'pending'
                        // Esto evita que el SDK use un consentimiento antiguo cuando hay un gestor externo activo
                        if (typeof localStorage !== 'undefined') {
                            var oldState = localStorage.getItem('guiders_consent_state');
                            if (oldState) {
                                localStorage.removeItem('guiders_consent_state');
                            }
                        }
                    } else {
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
     * Get Chat Selector configuration
     */
    private function getChatSelectorConfig() {
        $enabled = isset($this->settings['chat_selector_enabled']) ? (bool)$this->settings['chat_selector_enabled'] : false;

        // Si Chat Selector está deshabilitado, retornar config mínima
        if (!$enabled) {
            return array('enabled' => false);
        }

        return array(
            'enabled' => true,
            'newChatLabel' => isset($this->settings['chat_selector_new_chat_label'])
                ? $this->settings['chat_selector_new_chat_label']
                : 'Nueva conversación',
            'newChatEmoji' => isset($this->settings['chat_selector_new_chat_emoji'])
                ? $this->settings['chat_selector_new_chat_emoji']
                : '+',
            'maxChatsToShow' => isset($this->settings['chat_selector_max_chats'])
                ? intval($this->settings['chat_selector_max_chats'])
                : 10,
            'emptyStateMessage' => isset($this->settings['chat_selector_empty_message'])
                ? $this->settings['chat_selector_empty_message']
                : 'No hay conversaciones anteriores',
            'showUnreadBadge' => true
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