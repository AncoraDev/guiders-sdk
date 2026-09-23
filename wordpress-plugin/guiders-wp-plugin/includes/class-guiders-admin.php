<?php
/**
 * Admin functionality for Guiders WP Plugin with error protection
 *
 * @since 1.0.0
 * @version 1.2.0 - Added error handling
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class GuidersAdmin {

    /**
     * Constructor with error protection
     */
    public function __construct() {
        try {
            $this->initHooks();
        } catch (Throwable $e) {
            error_log('[Guiders Admin] Error in constructor: ' . $e->getMessage());
            // Don't throw - allow plugin to continue without admin functionality
        }
    }
    
    /**
     * Initialize admin hooks
     */
    private function initHooks() {
        // Add admin menu
        add_action('admin_menu', array($this, 'addAdminMenu'));
        
        // Register settings
        add_action('admin_init', array($this, 'registerSettings'));
        
        // Add admin styles and scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueueAdminAssets'));
        
        // Add admin notices
        add_action('admin_notices', array($this, 'showAdminNotices'));
    }
    
    /**
     * Add admin menu
     */
    public function addAdminMenu() {
        add_options_page(
            __('Guiders SDK', 'guiders-wp-plugin'),
            __('Guiders SDK', 'guiders-wp-plugin'),
            'manage_options',
            'guiders-settings',
            array($this, 'displaySettingsPage')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function registerSettings() {
        register_setting(
            'guiders_wp_plugin_settings_group',
            'guiders_wp_plugin_settings',
            array(
                'sanitize_callback' => array($this, 'validateSettings')
            )
        );
        
        // ==================== GENERAL TAB ====================
        // General settings section
        add_settings_section(
            'guiders_general_section',
            __('Configuración General', 'guiders-wp-plugin'),
            array($this, 'generalSectionCallback'),
            'guiders-settings-general'
        );

        // API Key field
        add_settings_field(
            'api_key',
            __('API Key', 'guiders-wp-plugin'),
            array($this, 'apiKeyFieldCallback'),
            'guiders-settings-general',
            'guiders_general_section'
        );

        // Enabled field
        add_settings_field(
            'enabled',
            __('Habilitar Guiders SDK', 'guiders-wp-plugin'),
            array($this, 'enabledFieldCallback'),
            'guiders-settings-general',
            'guiders_general_section'
        );

        // Environment field
        add_settings_field(
            'environment',
            __('Entorno', 'guiders-wp-plugin'),
            array($this, 'environmentFieldCallback'),
            'guiders-settings-general',
            'guiders_general_section'
        );
        
        // ==================== TRACKING TAB ====================
        // Tracking Features section
        add_settings_section(
            'guiders_tracking_features_section',
            __('Funciones de Tracking', 'guiders-wp-plugin'),
            array($this, 'trackingFeaturesSectionCallback'),
            'guiders-settings-tracking'
        );

        // Tracking enabled field
        add_settings_field(
            'tracking_enabled',
            __('Habilitar Tracking de Eventos', 'guiders-wp-plugin'),
            array($this, 'trackingEnabledFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_features_section'
        );

        // Heuristic detection field
        add_settings_field(
            'heuristic_detection',
            __('Detección Heurística Inteligente', 'guiders-wp-plugin'),
            array($this, 'heuristicDetectionFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_features_section'
        );

        // Confidence threshold field
        add_settings_field(
            'confidence_threshold',
            __('Umbral de Confianza', 'guiders-wp-plugin'),
            array($this, 'confidenceThresholdFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_features_section'
        );

        // Auto-init mode
        add_settings_field(
            'auto_init_mode',
            __('Modo de Auto-Init', 'guiders-wp-plugin'),
            array($this, 'autoInitModeFieldCallback'),
            'guiders-settings-general',
            'guiders_general_section'
        );

        // Auto-init delay
        add_settings_field(
            'auto_init_delay',
            __('Delay Auto-Init (ms)', 'guiders-wp-plugin'),
            array($this, 'autoInitDelayFieldCallback'),
            'guiders-settings-general',
            'guiders_general_section'
        );

        // Tracking V2 section
        add_settings_section(
            'guiders_tracking_v2_section',
            __('Tracking V2 - Sistema de Eventos Avanzado', 'guiders-wp-plugin'),
            array($this, 'trackingV2SectionCallback'),
            'guiders-settings-tracking'
        );

        // Tracking V2 enabled field
        add_settings_field(
            'tracking_v2_enabled',
            __('Habilitar Tracking V2', 'guiders-wp-plugin'),
            array($this, 'trackingV2EnabledFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

        // Tracking V2 batch size field
        add_settings_field(
            'tracking_v2_batch_size',
            __('Tamaño de Lote', 'guiders-wp-plugin'),
            array($this, 'trackingV2BatchSizeFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

        // Tracking V2 flush interval field
        add_settings_field(
            'tracking_v2_flush_interval',
            __('Intervalo de Envío (ms)', 'guiders-wp-plugin'),
            array($this, 'trackingV2FlushIntervalFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

        // Tracking V2 max queue size field
        add_settings_field(
            'tracking_v2_max_queue_size',
            __('Tamaño Máximo de Cola', 'guiders-wp-plugin'),
            array($this, 'trackingV2MaxQueueSizeFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

        // Tracking V2 persist queue field
        add_settings_field(
            'tracking_v2_persist_queue',
            __('Persistir Cola en localStorage', 'guiders-wp-plugin'),
            array($this, 'trackingV2PersistQueueFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

        // Tracking V2 bypass consent field
        add_settings_field(
            'tracking_v2_bypass_consent',
            __('⚠️ Bypass Consent (Solo Desarrollo)', 'guiders-wp-plugin'),
            array($this, 'trackingV2BypassConsentFieldCallback'),
            'guiders-settings-tracking',
            'guiders_tracking_v2_section'
        );

    }
    
    /**
     * Validate settings
     */
    public function validateSettings($input) {
        // IMPORTANTE: Obtener settings existentes primero para preservar valores de otras pestañas
        $existing = get_option('guiders_wp_plugin_settings', array());

        // Combinar con valores existentes (los nuevos valores sobrescriben los antiguos)
        $validated = is_array($existing) ? $existing : array();
        
        // Validate API key
        if (isset($input['api_key'])) {
            $validated['api_key'] = sanitize_text_field($input['api_key']);
        }
        
        // Helper function to validate checkbox values
        // Handles: true, 1, '1' = true | false, 0, '0', empty, null = false
        $validateCheckbox = function($value) {
            if (!isset($value)) return false;
            if ($value === '0' || $value === 0 || $value === false || $value === '') return false;
            return true;
        };

        // Validate enabled
        $validated['enabled'] = isset($input['enabled']) ? $validateCheckbox($input['enabled']) : false;

        // Validate environment
        if (isset($input['environment']) && in_array($input['environment'], array('production', 'development'))) {
            $validated['environment'] = sanitize_text_field($input['environment']);
        } else {
            $validated['environment'] = 'production';
        }

        // Validate chat color-scheme override
        if (isset($input['chat_color_scheme']) && in_array($input['chat_color_scheme'], array('system', 'light', 'dark'), true)) {
            $validated['chat_color_scheme'] = sanitize_text_field($input['chat_color_scheme']);
        } else {
            $validated['chat_color_scheme'] = 'system';
        }

        // Validate design theme
        if (isset($input['chat_theme']) && in_array($input['chat_theme'], array('default', 'carbon'), true)) {
            $validated['chat_theme'] = sanitize_text_field($input['chat_theme']);
        } else {
            $validated['chat_theme'] = 'default';
        }

        // Validate chat enabled
        $validated['chat_enabled'] = isset($input['chat_enabled']) ? $validateCheckbox($input['chat_enabled']) : false;

        // Validate tracking enabled
        $validated['tracking_enabled'] = isset($input['tracking_enabled']) ? $validateCheckbox($input['tracking_enabled']) : false;

        // Validate heuristic detection
        $validated['heuristic_detection'] = isset($input['heuristic_detection']) ? $validateCheckbox($input['heuristic_detection']) : false;
        
        // Validate confidence threshold
        if (isset($input['confidence_threshold'])) {
            $threshold = floatval($input['confidence_threshold']);
            if ($threshold >= 0 && $threshold <= 1) {
                $validated['confidence_threshold'] = $threshold;
            } else {
                $validated['confidence_threshold'] = 0.7;
                add_settings_error('guiders_wp_plugin_settings', 'confidence_threshold', __('El umbral de confianza debe estar entre 0 y 1.', 'guiders-wp-plugin'));
            }
        } else {
            $validated['confidence_threshold'] = 0.7;
        }

        // Validate auto init mode
        $valid_modes = array('immediate','domready','delayed','manual');
        if (isset($input['auto_init_mode']) && in_array($input['auto_init_mode'], $valid_modes)) {
            $validated['auto_init_mode'] = $input['auto_init_mode'];
        } else {
            $validated['auto_init_mode'] = 'domready';
        }

        // Validate delay
        if (isset($input['auto_init_delay'])) {
            $delay = intval($input['auto_init_delay']);
            if ($delay < 0) { $delay = 0; }
            if ($delay > 60000) { $delay = 60000; }
            $validated['auto_init_delay'] = $delay;
        } else {
            $validated['auto_init_delay'] = 500;
        }

        // Validate active hours settings
        $validated['active_hours_enabled'] = isset($input['active_hours_enabled']) ? $validateCheckbox($input['active_hours_enabled']) : false;
        
        // Validate timezone
        if (isset($input['active_hours_timezone'])) {
            $validated['active_hours_timezone'] = sanitize_text_field($input['active_hours_timezone']);
        } else {
            $validated['active_hours_timezone'] = '';
        }
        
        // Validate fallback message
        if (isset($input['active_hours_fallback_message'])) {
            $validated['active_hours_fallback_message'] = sanitize_textarea_field($input['active_hours_fallback_message']);
        } else {
            $validated['active_hours_fallback_message'] = '';
        }
        
        // Validate active hours ranges (JSON format)
        if (isset($input['active_hours_ranges'])) {
            $ranges_json = stripslashes($input['active_hours_ranges']);
            $ranges = json_decode($ranges_json, true);
            
            if (json_last_error() === JSON_ERROR_NONE && is_array($ranges)) {
                // Validate each range
                $valid_ranges = array();
                foreach ($ranges as $range) {
                    if (isset($range['start']) && isset($range['end']) && 
                        preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $range['start']) &&
                        preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $range['end'])) {
                        $valid_ranges[] = array(
                            'start' => sanitize_text_field($range['start']),
                            'end' => sanitize_text_field($range['end'])
                        );
                    }
                }
                $validated['active_hours_ranges'] = json_encode($valid_ranges);
            } else {
                $validated['active_hours_ranges'] = '[]';
            }
        } else {
            $validated['active_hours_ranges'] = '[]';
        }

        // Validate exclude weekends setting
        $validated['active_hours_exclude_weekends'] = isset($input['active_hours_exclude_weekends']) ? $validateCheckbox($input['active_hours_exclude_weekends']) : false;

        // Validate active days (JSON format)
        if (isset($input['active_hours_active_days'])) {
            $active_days_json = stripslashes($input['active_hours_active_days']);
            $active_days = json_decode($active_days_json, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($active_days)) {
                // Validate each day (must be 0-6)
                $valid_days = array();
                foreach ($active_days as $day) {
                    if (is_numeric($day) && $day >= 0 && $day <= 6) {
                        $valid_days[] = (int)$day;
                    }
                }
                // Remove duplicates and sort
                $valid_days = array_unique($valid_days);
                sort($valid_days);
                $validated['active_hours_active_days'] = json_encode($valid_days);
            } else {
                $validated['active_hours_active_days'] = '[]';
            }
        } else {
            $validated['active_hours_active_days'] = '[]';
        }

        // Validate commercial availability settings
        $validated['commercial_availability_enabled'] = isset($input['commercial_availability_enabled']) ? $validateCheckbox($input['commercial_availability_enabled']) : false;

        // Validate polling interval
        if (isset($input['commercial_availability_polling'])) {
            $polling = intval($input['commercial_availability_polling']);
            // Ensure between 10 and 300 seconds
            $validated['commercial_availability_polling'] = max(10, min(300, $polling));
        } else {
            $validated['commercial_availability_polling'] = 30; // Default value
        }

        // Validate show badge setting
        $validated['commercial_availability_show_badge'] = isset($input['commercial_availability_show_badge']) ? $validateCheckbox($input['commercial_availability_show_badge']) : false;

        // Validate Tracking V2 settings
        $validated['tracking_v2_enabled'] = isset($input['tracking_v2_enabled']) ? $validateCheckbox($input['tracking_v2_enabled']) : false;

        // Validate batch size (100-1000 events)
        if (isset($input['tracking_v2_batch_size'])) {
            $batch_size = intval($input['tracking_v2_batch_size']);
            $validated['tracking_v2_batch_size'] = max(100, min(1000, $batch_size));
        } else {
            $validated['tracking_v2_batch_size'] = 500; // Default value
        }

        // Validate flush interval (1000-30000 ms)
        if (isset($input['tracking_v2_flush_interval'])) {
            $flush_interval = intval($input['tracking_v2_flush_interval']);
            $validated['tracking_v2_flush_interval'] = max(1000, min(30000, $flush_interval));
        } else {
            $validated['tracking_v2_flush_interval'] = 5000; // Default value
        }

        // Validate max queue size (1000-50000 events)
        if (isset($input['tracking_v2_max_queue_size'])) {
            $max_queue = intval($input['tracking_v2_max_queue_size']);
            $validated['tracking_v2_max_queue_size'] = max(1000, min(50000, $max_queue));
        } else {
            $validated['tracking_v2_max_queue_size'] = 10000; // Default value
        }

        // Validate persist queue setting
        $validated['tracking_v2_persist_queue'] = isset($input['tracking_v2_persist_queue']) ? $validateCheckbox($input['tracking_v2_persist_queue']) : false;

        // Validate bypass consent setting (with security check)
        $validated['tracking_v2_bypass_consent'] = isset($input['tracking_v2_bypass_consent']) ? $validateCheckbox($input['tracking_v2_bypass_consent']) : false;

        // Add warning if bypass consent is enabled in production
        if ($validated['tracking_v2_bypass_consent'] && (!isset($validated['environment']) || $validated['environment'] !== 'development')) {
            add_settings_error(
                'guiders_wp_plugin_settings',
                'tracking_v2_bypass_consent_warning',
                __('⚠️ ADVERTENCIA: "Bypass Consent" está activado en un entorno de producción. Esta configuración solo debe usarse en desarrollo.', 'guiders-wp-plugin'),
                'warning'
            );
        }

        // Validate Chat Position settings
        if (isset($input['chat_position_data'])) {
            $position_data = stripslashes($input['chat_position_data']);
            $position = json_decode($position_data, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($position)) {
                $validated['chat_position_data'] = $position_data;
            } else {
                $validated['chat_position_data'] = '{}';
            }
        } else {
            $validated['chat_position_data'] = '{}';
        }

        // Validate Mobile Detection settings
        $valid_breakpoints = array('640', '768', '992', '1024');
        if (isset($input['mobile_breakpoint']) && in_array($input['mobile_breakpoint'], $valid_breakpoints, true)) {
            $validated['mobile_breakpoint'] = $input['mobile_breakpoint'];
        } else {
            $validated['mobile_breakpoint'] = '768'; // Default
        }

        $valid_modes = array('auto', 'size-only', 'touch-only', 'user-agent-only');
        if (isset($input['mobile_detection_mode']) && in_array($input['mobile_detection_mode'], $valid_modes, true)) {
            $validated['mobile_detection_mode'] = $input['mobile_detection_mode'];
        } else {
            $validated['mobile_detection_mode'] = 'auto'; // Default
        }

        $validated['mobile_detection_debug'] = isset($input['mobile_detection_debug']) ? $validateCheckbox($input['mobile_detection_debug']) : false;

        // GDPR / banner Guiders desactivado: el site ya tiene su propio CMP.
        $validated['consent_banner_enabled'] = false;
        $validated['require_consent'] = false;
        $validated['wp_consent_api_sync_enabled'] = false;
        $validated['chat_consent_message_enabled'] = false;

        // Validate banner style
        $valid_styles = array('bottom_bar', 'modal', 'corner');
        if (isset($input['consent_banner_style']) && in_array($input['consent_banner_style'], $valid_styles)) {
            $validated['consent_banner_style'] = $input['consent_banner_style'];
        } else {
            $validated['consent_banner_style'] = 'bottom_bar';
        }

        // Validate banner text
        if (isset($input['consent_banner_text'])) {
            $validated['consent_banner_text'] = sanitize_textarea_field($input['consent_banner_text']);
        } else {
            $validated['consent_banner_text'] = '🍪 Usamos cookies para mejorar tu experiencia y proporcionar chat en vivo.';
        }

        // Validate button texts
        $validated['consent_accept_text'] = isset($input['consent_accept_text']) ? sanitize_text_field($input['consent_accept_text']) : 'Aceptar Todo';
        $validated['consent_deny_text'] = isset($input['consent_deny_text']) ? sanitize_text_field($input['consent_deny_text']) : 'Rechazar';
        $validated['consent_preferences_text'] = isset($input['consent_preferences_text']) ? sanitize_text_field($input['consent_preferences_text']) : 'Preferencias';

        // Validate show preferences
        $validated['consent_show_preferences'] = isset($input['consent_show_preferences']) ? $validateCheckbox($input['consent_show_preferences']) : false;

        // Validate colors
        $validated['consent_banner_bg_color'] = isset($input['consent_banner_bg_color']) ? sanitize_hex_color($input['consent_banner_bg_color']) : '#2c3e50';
        $validated['consent_banner_text_color'] = isset($input['consent_banner_text_color']) ? sanitize_hex_color($input['consent_banner_text_color']) : '#ffffff';
        $validated['consent_accept_color'] = isset($input['consent_accept_color']) ? sanitize_hex_color($input['consent_accept_color']) : '#27ae60';
        $validated['consent_deny_color'] = isset($input['consent_deny_color']) ? sanitize_hex_color($input['consent_deny_color']) : '#95a5a6';
        $validated['consent_preferences_color'] = isset($input['consent_preferences_color']) ? sanitize_hex_color($input['consent_preferences_color']) : '#3498db';

        // Validate position
        $valid_positions = array('bottom', 'top');
        if (isset($input['consent_banner_position']) && in_array($input['consent_banner_position'], $valid_positions)) {
            $validated['consent_banner_position'] = $input['consent_banner_position'];
        } else {
            $validated['consent_banner_position'] = 'bottom';
        }

        // Validate auto show
        $validated['consent_auto_show'] = isset($input['consent_auto_show']) ? $validateCheckbox($input['consent_auto_show']) : false;

        // Validate chat consent message settings
        $validated['chat_consent_message_enabled'] = isset($input['chat_consent_message_enabled']) ? $validateCheckbox($input['chat_consent_message_enabled']) : false;

        // Validate chat consent message text
        if (isset($input['chat_consent_message_text'])) {
            $validated['chat_consent_message_text'] = sanitize_textarea_field($input['chat_consent_message_text']);
        } else {
            $validated['chat_consent_message_text'] = 'Al usar este chat, aceptas nuestra política de tratamiento de datos.';
        }

        // Validate chat consent privacy URL
        if (isset($input['chat_consent_privacy_url']) && !empty($input['chat_consent_privacy_url'])) {
            $validated['chat_consent_privacy_url'] = esc_url_raw($input['chat_consent_privacy_url']);
        } else {
            $validated['chat_consent_privacy_url'] = '';
        }

        // Validate chat consent privacy text
        if (isset($input['chat_consent_privacy_text'])) {
            $validated['chat_consent_privacy_text'] = sanitize_text_field($input['chat_consent_privacy_text']);
        } else {
            $validated['chat_consent_privacy_text'] = 'Política de Privacidad';
        }

        // Validate chat consent cookies URL
        if (isset($input['chat_consent_cookies_url']) && !empty($input['chat_consent_cookies_url'])) {
            $validated['chat_consent_cookies_url'] = esc_url_raw($input['chat_consent_cookies_url']);
        } else {
            $validated['chat_consent_cookies_url'] = '';
        }

        // Validate chat consent cookies text
        if (isset($input['chat_consent_cookies_text'])) {
            $validated['chat_consent_cookies_text'] = sanitize_text_field($input['chat_consent_cookies_text']);
        } else {
            $validated['chat_consent_cookies_text'] = 'Política de Cookies';
        }

        // Validate chat consent show once
        $validated['chat_consent_show_once'] = isset($input['chat_consent_show_once']) ? $validateCheckbox($input['chat_consent_show_once']) : false;

        // Validate auto-open chat on message (default: true)
        $validated['auto_open_chat_on_message'] = isset($input['auto_open_chat_on_message']) ? $validateCheckbox($input['auto_open_chat_on_message']) : true;

        // Validate cookie consent system
        $valid_cookie_systems = array('auto', 'internal', 'wp_consent_api', 'custom');
        if (isset($input['cookie_consent_system']) && in_array($input['cookie_consent_system'], $valid_cookie_systems)) {
            $validated['cookie_consent_system'] = sanitize_text_field($input['cookie_consent_system']);
        } else {
            $validated['cookie_consent_system'] = 'auto';
        }

        // Validate WP Consent API sync enabled
        $validated['wp_consent_api_sync_enabled'] = isset($input['wp_consent_api_sync_enabled']) ? $validateCheckbox($input['wp_consent_api_sync_enabled']) : false;

        // Validate cookie consent debug
        $validated['cookie_consent_debug'] = isset($input['cookie_consent_debug']) ? $validateCheckbox($input['cookie_consent_debug']) : false;

        // Validate Quick Actions settings
        $validated['quick_actions_enabled'] = isset($input['quick_actions_enabled']) ? $validateCheckbox($input['quick_actions_enabled']) : false;
        if (isset($input['quick_actions_welcome_message'])) {
            $validated['quick_actions_welcome_message'] = sanitize_textarea_field($input['quick_actions_welcome_message']);
        }
        $validated['quick_actions_show_on_first_open'] = isset($input['quick_actions_show_on_first_open']) ? $validateCheckbox($input['quick_actions_show_on_first_open']) : true;
        $validated['quick_actions_show_on_chat_start'] = isset($input['quick_actions_show_on_chat_start']) ? $validateCheckbox($input['quick_actions_show_on_chat_start']) : true;
        if (isset($input['quick_actions_buttons'])) {
            $validated['quick_actions_buttons'] = wp_kses_post($input['quick_actions_buttons']);
        }

        // Validate AI Config settings
        $validated['ai_enabled'] = isset($input['ai_enabled']) ? $validateCheckbox($input['ai_enabled']) : true;
        $validated['ai_show_indicator'] = isset($input['ai_show_indicator']) ? $validateCheckbox($input['ai_show_indicator']) : true;
        if (isset($input['ai_sender_name'])) {
            $validated['ai_sender_name'] = sanitize_text_field($input['ai_sender_name']);
        }
        $validated['ai_show_typing_indicator'] = isset($input['ai_show_typing_indicator']) ? $validateCheckbox($input['ai_show_typing_indicator']) : true;

        // Validate Chat Selector settings
        $validated['chat_selector_enabled'] = isset($input['chat_selector_enabled']) ? $validateCheckbox($input['chat_selector_enabled']) : false;
        if (isset($input['chat_selector_new_chat_label'])) {
            $validated['chat_selector_new_chat_label'] = sanitize_text_field($input['chat_selector_new_chat_label']);
        }
        if (isset($input['chat_selector_new_chat_emoji'])) {
            $validated['chat_selector_new_chat_emoji'] = sanitize_text_field($input['chat_selector_new_chat_emoji']);
        }
        if (isset($input['chat_selector_max_chats'])) {
            $max_chats = intval($input['chat_selector_max_chats']);
            $validated['chat_selector_max_chats'] = max(1, min(50, $max_chats));
        }
        if (isset($input['chat_selector_empty_message'])) {
            $validated['chat_selector_empty_message'] = sanitize_text_field($input['chat_selector_empty_message']);
        }

        // Chat, horarios, QA e IA ya no se configuran en WP. Un Guardar en
        // General no debe reactivar basura de la pestaña Chat antigua.
        $validated['chat_enabled'] = true;
        $validated['auto_open_chat_on_message'] = true;
        $validated['active_hours_enabled'] = false;
        $validated['commercial_availability_enabled'] = false;
        $validated['quick_actions_enabled'] = false;
        $validated['ai_enabled'] = false;
        $validated['chat_selector_enabled'] = true;
        $validated['consent_banner_enabled'] = false;
        $validated['require_consent'] = false;
        $validated['wp_consent_api_sync_enabled'] = false;
        $validated['chat_consent_message_enabled'] = false;

        return $validated;
    }
    
    /**
     * Display settings page with error protection
     */
    public function displaySettingsPage() {
        if (!current_user_can('manage_options')) {
            wp_die(__('No tienes permisos suficientes para acceder a esta página.', 'guiders-wp-plugin'));
        }

        try {
            $template_file = GUIDERS_WP_PLUGIN_PLUGIN_DIR . 'admin/partials/admin-display.php';

            // Verify template file exists before including
            if (!file_exists($template_file)) {
                echo '<div class="wrap">';
                echo '<h1>' . esc_html__('Guiders SDK - Error', 'guiders-wp-plugin') . '</h1>';
                echo '<div class="notice notice-error">';
                echo '<p><strong>' . esc_html__('Error:', 'guiders-wp-plugin') . '</strong> ';
                echo esc_html__('No se pudo cargar la página de configuración. El archivo de template no existe.', 'guiders-wp-plugin');
                echo '</p>';
                echo '<p>' . esc_html__('Por favor, reinstala el plugin desde GitHub.', 'guiders-wp-plugin') . '</p>';
                echo '</div>';
                echo '</div>';

                error_log('[Guiders Admin] Settings template file not found: ' . $template_file);
                return;
            }

            include $template_file;

        } catch (Throwable $e) {
            echo '<div class="wrap">';
            echo '<h1>' . esc_html__('Guiders SDK - Error', 'guiders-wp-plugin') . '</h1>';
            echo '<div class="notice notice-error">';
            echo '<p><strong>' . esc_html__('Error:', 'guiders-wp-plugin') . '</strong> ';
            echo esc_html__('Ocurrió un error al cargar la página de configuración.', 'guiders-wp-plugin');
            echo '</p>';
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<p><code>' . esc_html($e->getMessage()) . '</code></p>';
            }
            echo '</div>';
            echo '</div>';

            error_log('[Guiders Admin] Error loading settings page: ' . $e->getMessage());
        }
    }
    
    /**
     * General section callback
     */
    public function generalSectionCallback() {
        echo '<p>' . __('Configura las opciones básicas del SDK de Guiders.', 'guiders-wp-plugin') . '</p>';
    }
    
    /**
     * Features section callback
     */
    public function featuresSectionCallback() {
        echo '<p>' . __('Configura las características específicas del SDK.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat features section callback
     */
    public function chatFeaturesSectionCallback() {
        echo '<p>' . __('Configura las opciones del chat en vivo.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking features section callback
     */
    public function trackingFeaturesSectionCallback() {
        echo '<p>' . __('Configura las opciones de tracking y análisis de eventos.', 'guiders-wp-plugin') . '</p>';
    }
    
    /**
     * API Key field callback
     */
    public function apiKeyFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $api_key = isset($settings['api_key']) ? $settings['api_key'] : '';
        echo '<input type="text" id="api_key" name="guiders_wp_plugin_settings[api_key]" value="' . esc_attr($api_key) . '" class="regular-text" />';
        echo '<p class="description">' . __('Tu API Key de Guiders. Obténla desde tu panel de control de Guiders.', 'guiders-wp-plugin') . '</p>';
    }
    
    /**
     * Enabled field callback
     */
    public function enabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['enabled']) ? $settings['enabled'] : false;
        echo '<input type="checkbox" id="enabled" name="guiders_wp_plugin_settings[enabled]" value="1" ' . checked(1, $enabled, false) . ' />';
        echo '<label for="enabled">' . __('Habilitar el SDK de Guiders en tu sitio web', 'guiders-wp-plugin') . '</label>';
    }
    
    /**
     * Environment field callback
     */
    public function environmentFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $environment = isset($settings['environment']) ? $settings['environment'] : 'production';
        echo '<select id="environment" name="guiders_wp_plugin_settings[environment]">';
        echo '<option value="production" ' . selected('production', $environment, false) . '>' . __('Producción', 'guiders-wp-plugin') . '</option>';
        echo '<option value="development" ' . selected('development', $environment, false) . '>' . __('Desarrollo', 'guiders-wp-plugin') . '</option>';
        echo '</select>';
        echo '<p class="description">' . __('Selecciona el entorno. Usa "Desarrollo" solo para pruebas locales.', 'guiders-wp-plugin') . '</p>';
    }
    
    /**
     * Chat enabled field callback
     */
    public function chatEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $chat_enabled = isset($settings['chat_enabled']) ? $settings['chat_enabled'] : true;
        echo '<input type="checkbox" id="chat_enabled" name="guiders_wp_plugin_settings[chat_enabled]" value="1" ' . checked(1, $chat_enabled, false) . ' />';
        echo '<label for="chat_enabled">' . __('Habilitar el chat en vivo con carga diferida', 'guiders-wp-plugin') . '</label>';
    }

    /**
     * Auto-open chat on message field callback
     */
    public function autoOpenChatOnMessageFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $auto_open = isset($settings['auto_open_chat_on_message']) ? $settings['auto_open_chat_on_message'] : true;
        echo '<input type="checkbox" id="auto_open_chat_on_message" name="guiders_wp_plugin_settings[auto_open_chat_on_message]" value="1" ' . checked(1, $auto_open, false) . ' />';
        echo '<label for="auto_open_chat_on_message">' . __('Abrir automáticamente el chat cuando llega un mensaje nuevo', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está habilitado, el chat se abrirá automáticamente cuando el visitante reciba un mensaje nuevo (solo si el chat está cerrado).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking enabled field callback
     */
    public function trackingEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $tracking_enabled = isset($settings['tracking_enabled']) ? $settings['tracking_enabled'] : true;
        echo '<input type="checkbox" id="tracking_enabled" name="guiders_wp_plugin_settings[tracking_enabled]" value="1" ' . checked(1, $tracking_enabled, false) . ' />';
        echo '<label for="tracking_enabled">' . __('Habilitar el tracking automático de eventos', 'guiders-wp-plugin') . '</label>';
    }
    
    /**
     * Heuristic detection field callback
     */
    public function heuristicDetectionFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $heuristic_detection = isset($settings['heuristic_detection']) ? $settings['heuristic_detection'] : true;
        echo '<input type="checkbox" id="heuristic_detection" name="guiders_wp_plugin_settings[heuristic_detection]" value="1" ' . checked(1, $heuristic_detection, false) . ' />';
        echo '<label for="heuristic_detection">' . __('Habilitar detección heurística inteligente de elementos', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Detecta automáticamente botones de "agregar al carrito", "contactar", etc. sin modificar el HTML.', 'guiders-wp-plugin') . '</p>';
    }
    
    /**
     * Confidence threshold field callback
     */
    public function confidenceThresholdFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $confidence_threshold = isset($settings['confidence_threshold']) ? $settings['confidence_threshold'] : 0.7;
        echo '<input type="number" id="confidence_threshold" name="guiders_wp_plugin_settings[confidence_threshold]" value="' . esc_attr($confidence_threshold) . '" min="0" max="1" step="0.1" class="small-text" />';
        echo '<p class="description">' . __('Nivel de confianza mínimo para la detección heurística (0.0 - 1.0). Mayor valor = más estricto.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat color-scheme override field callback
     */
    public function chatColorSchemeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $scheme = isset($settings['chat_color_scheme']) ? $settings['chat_color_scheme'] : 'system';
        $options = array(
            'system' => __('Automático (preferencia del sistema operativo)', 'guiders-wp-plugin'),
            'light'  => __('Claro', 'guiders-wp-plugin'),
            'dark'   => __('Oscuro', 'guiders-wp-plugin'),
        );
        echo '<select id="chat_color_scheme" name="guiders_wp_plugin_settings[chat_color_scheme]">';
        foreach ($options as $val => $label) {
            echo '<option value="' . esc_attr($val) . '" ' . selected($val, $scheme, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Fuerza el modo claro u oscuro del widget independientemente de la preferencia del sistema del visitante. Los cambios se aplican en la próxima carga de página.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Design theme field callback
     */
    public function chatThemeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $theme = isset($settings['chat_theme']) ? $settings['chat_theme'] : 'default';
        $options = array(
            'default' => __('Default (slate/blanco — clásico Guiders)', 'guiders-wp-plugin'),
            'carbon'  => __('Carbon (negro carbono — estilo Vercel)', 'guiders-wp-plugin'),
        );
        echo '<select id="chat_theme" name="guiders_wp_plugin_settings[chat_theme]">';
        foreach ($options as $val => $label) {
            echo '<option value="' . esc_attr($val) . '" ' . selected($val, $theme, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Selecciona la paleta visual del widget. Carbon usa negros puros y grises zinc (inspirado en Vercel). Los cambios se aplican en la próxima carga de página.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Auto init mode field callback
     */
    public function autoInitModeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $mode = isset($settings['auto_init_mode']) ? $settings['auto_init_mode'] : 'domready';
        $options = array(
            'immediate' => __('Inmediato (tan pronto cargue el script)', 'guiders-wp-plugin'),
            'domready'  => __('DOM Ready (DOMContentLoaded)', 'guiders-wp-plugin'),
            'delayed'   => __('Delay Personalizado', 'guiders-wp-plugin'),
            'manual'    => __('Manual (lo iniciaré yo)', 'guiders-wp-plugin')
        );
        echo '<select id="auto_init_mode" name="guiders_wp_plugin_settings[auto_init_mode]">';
        foreach ($options as $val => $label) {
            echo '<option value="' . esc_attr($val) . '" ' . selected($val, $mode, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Controla cuándo se inicializa el SDK: inmediato, al estar listo el DOM, con delay o manual.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Auto init delay field callback
     */
    public function autoInitDelayFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $delay = isset($settings['auto_init_delay']) ? intval($settings['auto_init_delay']) : 500;
        echo '<input type="number" id="auto_init_delay" name="guiders_wp_plugin_settings[auto_init_delay]" value="' . esc_attr($delay) . '" min="0" max="60000" step="100" class="small-text" />';
        echo '<p class="description">' . __('Milisegundos de espera si el modo = Delay Personalizado (0 - 60000).', 'guiders-wp-plugin') . '</p>';
    }

    // === Chat Consent Message Field Callbacks ===

    /**
     * Chat consent message section callback
     */
    public function chatConsentMessageSectionCallback() {
        echo '<p>' . __('Configura el mensaje de consentimiento que aparecerá al abrir el chat. Similar al mensaje de Zara: "Al unirte al chat, confirmas que has leído y entiendes nuestra Política de Privacidad y Cookies".', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent message enabled field callback
     */
    public function chatConsentMessageEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['chat_consent_message_enabled']) ? $settings['chat_consent_message_enabled'] : false;

        echo '<input type="checkbox" id="chat_consent_message_enabled" name="guiders_wp_plugin_settings[chat_consent_message_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="chat_consent_message_enabled">' . __('Mostrar mensaje de consentimiento en el chat', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('El mensaje aparecerá antes del mensaje de bienvenida.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent message text field callback
     */
    public function chatConsentMessageTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['chat_consent_message_text']) ? $settings['chat_consent_message_text'] : 'Al unirte al chat, confirmas que has leído y entiendes nuestra';

        echo '<textarea id="chat_consent_message_text" name="guiders_wp_plugin_settings[chat_consent_message_text]" rows="3" class="large-text">' . esc_textarea($text) . '</textarea>';
        echo '<p class="description">' . __('Texto principal del mensaje (sin incluir los enlaces a políticas).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent privacy URL field callback
     */
    public function chatConsentPrivacyUrlFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $url = isset($settings['chat_consent_privacy_url']) ? $settings['chat_consent_privacy_url'] : '';

        echo '<input type="url" id="chat_consent_privacy_url" name="guiders_wp_plugin_settings[chat_consent_privacy_url]" value="' . esc_attr($url) . '" class="regular-text" placeholder="https://tudominio.com/privacidad" />';
        echo '<p class="description">' . __('URL de tu página de Política de Privacidad (ej: https://tudominio.com/privacidad).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent privacy text field callback
     */
    public function chatConsentPrivacyTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['chat_consent_privacy_text']) ? $settings['chat_consent_privacy_text'] : 'Política de Privacidad';

        echo '<input type="text" id="chat_consent_privacy_text" name="guiders_wp_plugin_settings[chat_consent_privacy_text]" value="' . esc_attr($text) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del enlace a la Política de Privacidad.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent cookies URL field callback
     */
    public function chatConsentCookiesUrlFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $url = isset($settings['chat_consent_cookies_url']) ? $settings['chat_consent_cookies_url'] : '';

        echo '<input type="url" id="chat_consent_cookies_url" name="guiders_wp_plugin_settings[chat_consent_cookies_url]" value="' . esc_attr($url) . '" class="regular-text" placeholder="https://tudominio.com/cookies" />';
        echo '<p class="description">' . __('URL de tu página de Política de Cookies (déjalo vacío si no quieres mostrar este enlace).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent cookies text field callback
     */
    public function chatConsentCookiesTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['chat_consent_cookies_text']) ? $settings['chat_consent_cookies_text'] : 'Política de Cookies';

        echo '<input type="text" id="chat_consent_cookies_text" name="guiders_wp_plugin_settings[chat_consent_cookies_text]" value="' . esc_attr($text) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del enlace a la Política de Cookies.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat consent show once field callback
     */
    public function chatConsentShowOnceFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show_once = isset($settings['chat_consent_show_once']) ? $settings['chat_consent_show_once'] : true;

        echo '<input type="checkbox" id="chat_consent_show_once" name="guiders_wp_plugin_settings[chat_consent_show_once]" value="1" ' . checked($show_once, true, false) . ' />';
        echo '<label for="chat_consent_show_once">' . __('Mostrar solo una vez por sesión', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, el mensaje se mostrará solo la primera vez que el usuario abra el chat.', 'guiders-wp-plugin') . '</p>';
    }

    // === Active Hours Field Callbacks ===

    /**
     * Active hours section callback
     */
    public function activeHoursSectionCallback() {
        echo '<p>' . __('Configure los horarios en los que el chat estará disponible para sus visitantes. Fuera de estos horarios, el chat estará oculto.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Active hours enabled field callback
     */
    public function activeHoursEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['active_hours_enabled']) ? $settings['active_hours_enabled'] : false;
        
        echo '<input type="checkbox" id="active_hours_enabled" name="guiders_wp_plugin_settings[active_hours_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="active_hours_enabled">' . __('Activar restricción por horarios', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está desactivado, el chat estará disponible las 24 horas.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Active hours timezone field callback
     */
    public function activeHoursTimezoneFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $timezone = isset($settings['active_hours_timezone']) ? $settings['active_hours_timezone'] : '';
        
        // Get common timezones
        $timezones = array(
            '' => __('-- Usar zona horaria local del navegador --', 'guiders-wp-plugin'),
            'America/New_York' => __('America/New_York (EST/EDT)', 'guiders-wp-plugin'),
            'America/Chicago' => __('America/Chicago (CST/CDT)', 'guiders-wp-plugin'),
            'America/Denver' => __('America/Denver (MST/MDT)', 'guiders-wp-plugin'),
            'America/Los_Angeles' => __('America/Los_Angeles (PST/PDT)', 'guiders-wp-plugin'),
            'America/Mexico_City' => __('America/Mexico_City (México)', 'guiders-wp-plugin'),
            'America/Bogota' => __('America/Bogota (Colombia)', 'guiders-wp-plugin'),
            'America/Lima' => __('America/Lima (Perú)', 'guiders-wp-plugin'),
            'America/Argentina/Buenos_Aires' => __('America/Argentina/Buenos_Aires (Argentina)', 'guiders-wp-plugin'),
            'America/Sao_Paulo' => __('America/Sao_Paulo (Brasil)', 'guiders-wp-plugin'),
            'Europe/Madrid' => __('Europe/Madrid (España)', 'guiders-wp-plugin'),
            'Europe/London' => __('Europe/London (Reino Unido)', 'guiders-wp-plugin'),
            'Europe/Paris' => __('Europe/Paris (Francia)', 'guiders-wp-plugin'),
            'UTC' => __('UTC (Tiempo Universal Coordinado)', 'guiders-wp-plugin')
        );
        
        echo '<select id="active_hours_timezone" name="guiders_wp_plugin_settings[active_hours_timezone]">';
        foreach ($timezones as $value => $label) {
            echo '<option value="' . esc_attr($value) . '" ' . selected($timezone, $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Seleccione la zona horaria para interpretar los horarios configurados. Si no se especifica, se usará la zona horaria local del navegador del visitante.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Active hours ranges field callback
     */
    public function activeHoursRangesFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $ranges_json = isset($settings['active_hours_ranges']) ? $settings['active_hours_ranges'] : '[]';
        $ranges = json_decode($ranges_json, true);
        if (!is_array($ranges)) {
            $ranges = array();
        }
        
        echo '<div id="active-hours-ranges-container">';
        echo '<div id="active-hours-ranges">';
        
        if (empty($ranges)) {
            // Default example range
            $ranges = array(array('start' => '09:00', 'end' => '18:00'));
        }
        
        foreach ($ranges as $index => $range) {
            echo '<div class="active-hours-range" data-index="' . $index . '">';
            echo '<label>' . __('Desde:', 'guiders-wp-plugin') . '</label> ';
            echo '<input type="time" class="range-start" value="' . esc_attr($range['start']) . '" /> ';
            echo '<label>' . __('Hasta:', 'guiders-wp-plugin') . '</label> ';
            echo '<input type="time" class="range-end" value="' . esc_attr($range['end']) . '" /> ';
            echo '<button type="button" class="button remove-range">' . __('Eliminar', 'guiders-wp-plugin') . '</button>';
            echo '</div>';
        }
        
        echo '</div>';
        echo '<button type="button" id="add-range" class="button">' . __('+ Agregar horario', 'guiders-wp-plugin') . '</button>';
        echo '</div>';
        
        echo '<input type="hidden" id="active_hours_ranges" name="guiders_wp_plugin_settings[active_hours_ranges]" value="' . esc_attr($ranges_json) . '" />';
        
        echo '<p class="description">' . __('Configure uno o más rangos de horarios. Ejemplo: 08:00-14:00 y 15:00-17:00 para horario partido.', 'guiders-wp-plugin') . '</p>';
        
        // JavaScript for managing ranges
        echo '<script>
        jQuery(document).ready(function($) {
            function updateRangesInput() {
                var ranges = [];
                $("#active-hours-ranges .active-hours-range").each(function() {
                    var start = $(this).find(".range-start").val();
                    var end = $(this).find(".range-end").val();
                    if (start && end) {
                        ranges.push({start: start, end: end});
                    }
                });
                $("#active_hours_ranges").val(JSON.stringify(ranges));
            }
            
            $("#add-range").click(function() {
                var index = $("#active-hours-ranges .active-hours-range").length;
                var rangeHtml = \'<div class="active-hours-range" data-index="\' + index + \'">\' +
                    \'<label>' . __('Desde:', 'guiders-wp-plugin') . '</label> \' +
                    \'<input type="time" class="range-start" value="09:00" /> \' +
                    \'<label>' . __('Hasta:', 'guiders-wp-plugin') . '</label> \' +
                    \'<input type="time" class="range-end" value="18:00" /> \' +
                    \'<button type="button" class="button remove-range">' . __('Eliminar', 'guiders-wp-plugin') . '</button>\' +
                    \'</div>\';
                $("#active-hours-ranges").append(rangeHtml);
                updateRangesInput();
            });
            
            $(document).on("click", ".remove-range", function() {
                $(this).closest(".active-hours-range").remove();
                updateRangesInput();
            });
            
            $(document).on("change", ".range-start, .range-end", function() {
                updateRangesInput();
            });
            
            // Initialize
            updateRangesInput();
        });
        </script>';
        
        echo '<style>
        .active-hours-range {
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
        }
        .active-hours-range label {
            margin-left: 10px;
            margin-right: 5px;
        }
        .active-hours-range input[type="time"] {
            margin-right: 10px;
        }
        #add-range {
            margin-top: 10px;
        }
        </style>';
    }

    /**
     * Active hours fallback message field callback
     */
    public function activeHoursFallbackMessageFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $message = isset($settings['active_hours_fallback_message']) ? $settings['active_hours_fallback_message'] : '';

        echo '<textarea id="active_hours_fallback_message" name="guiders_wp_plugin_settings[active_hours_fallback_message]" rows="3" cols="50" class="large-text">' . esc_textarea($message) . '</textarea>';
        echo '<p class="description">' . __('Mensaje que se mostrará cuando el chat no esté disponible por horarios. Si se deja vacío, se usará un mensaje predeterminado.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Active hours exclude weekends field callback
     */
    public function activeHoursExcludeWeekendsFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $exclude_weekends = isset($settings['active_hours_exclude_weekends']) ? $settings['active_hours_exclude_weekends'] : false;

        echo '<input type="checkbox" id="active_hours_exclude_weekends" name="guiders_wp_plugin_settings[active_hours_exclude_weekends]" value="1" ' . checked($exclude_weekends, true, false) . ' />';
        echo '<label for="active_hours_exclude_weekends">' . __('El chat solo estará disponible de lunes a viernes', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Conveniente para horarios de oficina. Si necesitas control más específico, usa "Días Activos" abajo.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Active hours active days field callback
     */
    public function activeHoursActiveDaysFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $active_days_json = isset($settings['active_hours_active_days']) ? $settings['active_hours_active_days'] : '[]';
        $active_days = json_decode($active_days_json, true);
        if (!is_array($active_days)) {
            $active_days = array();
        }

        $days = array(
            0 => __('Domingo', 'guiders-wp-plugin'),
            1 => __('Lunes', 'guiders-wp-plugin'),
            2 => __('Martes', 'guiders-wp-plugin'),
            3 => __('Miércoles', 'guiders-wp-plugin'),
            4 => __('Jueves', 'guiders-wp-plugin'),
            5 => __('Viernes', 'guiders-wp-plugin'),
            6 => __('Sábado', 'guiders-wp-plugin')
        );

        echo '<div class="active-days-checkboxes">';
        foreach ($days as $day_num => $day_name) {
            $checked = in_array($day_num, $active_days) ? 'checked' : '';
            echo '<label style="display: inline-block; margin-right: 15px; margin-bottom: 5px;">';
            echo '<input type="checkbox" class="active-day-checkbox" value="' . $day_num . '" ' . $checked . ' /> ';
            echo esc_html($day_name);
            echo '</label>';
        }
        echo '</div>';

        echo '<input type="hidden" id="active_hours_active_days" name="guiders_wp_plugin_settings[active_hours_active_days]" value="' . esc_attr($active_days_json) . '" />';

        echo '<p class="description">' . __('Control avanzado: selecciona días específicos. Si está vacío, todos los días están activos. NOTA: Si "Excluir Fines de Semana" está marcado, esta opción tiene prioridad.', 'guiders-wp-plugin') . '</p>';

        echo '<script>
        jQuery(document).ready(function($) {
            $(".active-day-checkbox").change(function() {
                var activeDays = [];
                $(".active-day-checkbox:checked").each(function() {
                    activeDays.push(parseInt($(this).val()));
                });
                $("#active_hours_active_days").val(JSON.stringify(activeDays));
            });
        });
        </script>';
    }

    // === Commercial Availability Field Callbacks ===

    /**
     * Commercial availability section callback
     */
    public function commercialAvailabilitySectionCallback() {
        echo '<p>' . __('Configure el sistema para mostrar/ocultar automáticamente el chat según la disponibilidad de comerciales en línea.', 'guiders-wp-plugin') . '</p>';
        echo '<p class="description">' . __('El SDK verificará periódicamente si hay comerciales disponibles y mostrará u ocultará el chat automáticamente.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Commercial availability enabled field callback
     */
    public function commercialAvailabilityEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['commercial_availability_enabled']) ? $settings['commercial_availability_enabled'] : false;

        echo '<input type="checkbox" id="commercial_availability_enabled" name="guiders_wp_plugin_settings[commercial_availability_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="commercial_availability_enabled">' . __('Activar verificación de disponibilidad', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, el chat solo se mostrará cuando haya al menos un comercial disponible.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Commercial availability polling interval field callback
     */
    public function commercialAvailabilityPollingFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $polling_interval = isset($settings['commercial_availability_polling']) ? $settings['commercial_availability_polling'] : 30;

        echo '<input type="number" id="commercial_availability_polling" name="guiders_wp_plugin_settings[commercial_availability_polling]" value="' . esc_attr($polling_interval) . '" min="10" max="300" />';
        echo '<p class="description">' . __('Intervalo en segundos para verificar disponibilidad (recomendado: 30). Mínimo: 10, Máximo: 300.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Commercial availability show badge field callback
     */
    public function commercialAvailabilityShowBadgeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show_badge = isset($settings['commercial_availability_show_badge']) ? $settings['commercial_availability_show_badge'] : false;

        echo '<input type="checkbox" id="commercial_availability_show_badge" name="guiders_wp_plugin_settings[commercial_availability_show_badge]" value="1" ' . checked($show_badge, true, false) . ' />';
        echo '<label for="commercial_availability_show_badge">' . __('Mostrar número de comerciales disponibles', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, se mostrará un contador en el botón del chat con el número de comerciales disponibles.', 'guiders-wp-plugin') . '</p>';
    }

    // === Quick Actions Field Callbacks ===

    /**
     * Quick Actions section callback
     */
    public function quickActionsSectionCallback() {
        echo '<p>' . __('Configure los botones de acción rápida que aparecerán cuando el visitante abra el chat.', 'guiders-wp-plugin') . '</p>';
        echo '<p class="description">' . __('Los Quick Actions permiten ofrecer opciones predefinidas para facilitar la interacción del visitante con el chat.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Quick Actions enabled field callback
     */
    public function quickActionsEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['quick_actions_enabled']) ? $settings['quick_actions_enabled'] : false;

        echo '<input type="checkbox" id="quick_actions_enabled" name="guiders_wp_plugin_settings[quick_actions_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="quick_actions_enabled">' . __('Mostrar botones de acción rápida en el chat', 'guiders-wp-plugin') . '</label>';
    }

    /**
     * Quick Actions welcome message field callback
     */
    public function quickActionsWelcomeMessageFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $message = isset($settings['quick_actions_welcome_message']) ? $settings['quick_actions_welcome_message'] : 'Te lee una persona, no un bot.';

        echo '<input type="text" id="quick_actions_welcome_message" name="guiders_wp_plugin_settings[quick_actions_welcome_message]" value="' . esc_attr($message) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del estado vacío del chat, bajo el título «Cuéntanos qué necesitas».', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Quick Actions show on first open field callback
     */
    public function quickActionsShowOnFirstOpenFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show = isset($settings['quick_actions_show_on_first_open']) ? $settings['quick_actions_show_on_first_open'] : true;

        echo '<input type="checkbox" id="quick_actions_show_on_first_open" name="guiders_wp_plugin_settings[quick_actions_show_on_first_open]" value="1" ' . checked($show, true, false) . ' />';
        echo '<label for="quick_actions_show_on_first_open">' . __('Mostrar los botones la primera vez que se abre el chat', 'guiders-wp-plugin') . '</label>';
    }

    /**
     * Quick Actions show on chat start field callback
     */
    public function quickActionsShowOnChatStartFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show = isset($settings['quick_actions_show_on_chat_start']) ? $settings['quick_actions_show_on_chat_start'] : true;

        echo '<input type="checkbox" id="quick_actions_show_on_chat_start" name="guiders_wp_plugin_settings[quick_actions_show_on_chat_start]" value="1" ' . checked($show, true, false) . ' />';
        echo '<label for="quick_actions_show_on_chat_start">' . __('Mostrar los botones cuando se inicia una nueva conversación', 'guiders-wp-plugin') . '</label>';
    }

    /**
     * Quick Actions buttons field callback
     */
    public function quickActionsButtonsFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $buttons_json = isset($settings['quick_actions_buttons']) ? $settings['quick_actions_buttons'] : '';

        // Default buttons if empty
        $default_buttons = array(
            array('id' => 'greet', 'label' => 'Saludar', 'emoji' => '👋', 'actionType' => 'send_message', 'payload' => '¡Hola! Me gustaría obtener más información.'),
            array('id' => 'pricing', 'label' => 'Ver precios', 'emoji' => '💰', 'actionType' => 'send_message', 'payload' => '¿Cuáles son sus planes y precios?'),
            array('id' => 'agent', 'label' => 'Hablar con persona', 'emoji' => '👤', 'actionType' => 'request_agent', 'payload' => ''),
            array('id' => 'help', 'label' => 'Centro de ayuda', 'emoji' => '📚', 'actionType' => 'open_url', 'payload' => 'https://help.example.com')
        );

        $buttons = !empty($buttons_json) ? json_decode($buttons_json, true) : $default_buttons;
        if (!is_array($buttons)) {
            $buttons = $default_buttons;
        }
        ?>
        <div id="quick-actions-buttons-container">
            <table class="widefat quick-actions-table" style="max-width: 800px;">
                <thead>
                    <tr>
                        <th style="width: 80px;"><?php _e('Emoji', 'guiders-wp-plugin'); ?></th>
                        <th style="width: 120px;"><?php _e('Etiqueta', 'guiders-wp-plugin'); ?></th>
                        <th style="width: 140px;"><?php _e('Tipo de Acción', 'guiders-wp-plugin'); ?></th>
                        <th><?php _e('Payload/URL', 'guiders-wp-plugin'); ?></th>
                        <th style="width: 60px;"><?php _e('Acciones', 'guiders-wp-plugin'); ?></th>
                    </tr>
                </thead>
                <tbody id="quick-actions-buttons-list">
                    <?php foreach ($buttons as $index => $button): ?>
                    <tr class="quick-action-row" data-index="<?php echo $index; ?>">
                        <td>
                            <input type="text" class="qa-emoji" value="<?php echo esc_attr($button['emoji'] ?? ''); ?>" style="width: 60px; text-align: center; font-size: 20px;" />
                        </td>
                        <td>
                            <input type="text" class="qa-label" value="<?php echo esc_attr($button['label'] ?? ''); ?>" style="width: 100%;" />
                        </td>
                        <td>
                            <select class="qa-action-type" style="width: 100%;">
                                <option value="send_message" <?php selected($button['actionType'] ?? '', 'send_message'); ?>><?php _e('Enviar mensaje', 'guiders-wp-plugin'); ?></option>
                                <option value="request_agent" <?php selected($button['actionType'] ?? '', 'request_agent'); ?>><?php _e('Solicitar agente', 'guiders-wp-plugin'); ?></option>
                                <option value="open_url" <?php selected($button['actionType'] ?? '', 'open_url'); ?>><?php _e('Abrir URL', 'guiders-wp-plugin'); ?></option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="qa-payload" value="<?php echo esc_attr($button['payload'] ?? ''); ?>" style="width: 100%;" placeholder="<?php _e('Mensaje o URL...', 'guiders-wp-plugin'); ?>" />
                        </td>
                        <td>
                            <button type="button" class="button qa-remove-btn" title="<?php _e('Eliminar', 'guiders-wp-plugin'); ?>">✕</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <p style="margin-top: 10px;">
                <button type="button" class="button button-secondary" id="qa-add-button">
                    <?php _e('+ Añadir botón', 'guiders-wp-plugin'); ?>
                </button>
            </p>
            <input type="hidden" id="quick_actions_buttons" name="guiders_wp_plugin_settings[quick_actions_buttons]" value="<?php echo esc_attr($buttons_json); ?>" />
        </div>
        <p class="description">
            <?php _e('Tipos de acción:', 'guiders-wp-plugin'); ?><br>
            • <strong><?php _e('Enviar mensaje', 'guiders-wp-plugin'); ?>:</strong> <?php _e('Envía el texto del payload como mensaje en el chat.', 'guiders-wp-plugin'); ?><br>
            • <strong><?php _e('Solicitar agente', 'guiders-wp-plugin'); ?>:</strong> <?php _e('Solicita un agente humano (no requiere payload).', 'guiders-wp-plugin'); ?><br>
            • <strong><?php _e('Abrir URL', 'guiders-wp-plugin'); ?>:</strong> <?php _e('Abre la URL del payload en una nueva pestaña.', 'guiders-wp-plugin'); ?>
        </p>
        <script>
        jQuery(document).ready(function($) {
            var buttonIndex = <?php echo count($buttons); ?>;

            function updateHiddenField() {
                var buttons = [];
                $('#quick-actions-buttons-list tr.quick-action-row').each(function(i) {
                    var $row = $(this);
                    var button = {
                        id: 'btn_' + i,
                        emoji: $row.find('.qa-emoji').val(),
                        label: $row.find('.qa-label').val(),
                        actionType: $row.find('.qa-action-type').val(),
                        payload: $row.find('.qa-payload').val()
                    };
                    if (button.label) { // Solo añadir si tiene etiqueta
                        buttons.push(button);
                    }
                });
                $('#quick_actions_buttons').val(JSON.stringify(buttons));
            }

            // Add button
            $('#qa-add-button').on('click', function() {
                var newRow = '<tr class="quick-action-row" data-index="' + buttonIndex + '">' +
                    '<td><input type="text" class="qa-emoji" value="" style="width: 60px; text-align: center; font-size: 20px;" /></td>' +
                    '<td><input type="text" class="qa-label" value="" style="width: 100%;" /></td>' +
                    '<td><select class="qa-action-type" style="width: 100%;">' +
                        '<option value="send_message"><?php _e('Enviar mensaje', 'guiders-wp-plugin'); ?></option>' +
                        '<option value="request_agent"><?php _e('Solicitar agente', 'guiders-wp-plugin'); ?></option>' +
                        '<option value="open_url"><?php _e('Abrir URL', 'guiders-wp-plugin'); ?></option>' +
                    '</select></td>' +
                    '<td><input type="text" class="qa-payload" value="" style="width: 100%;" placeholder="<?php _e('Mensaje o URL...', 'guiders-wp-plugin'); ?>" /></td>' +
                    '<td><button type="button" class="button qa-remove-btn" title="<?php _e('Eliminar', 'guiders-wp-plugin'); ?>">✕</button></td>' +
                '</tr>';
                $('#quick-actions-buttons-list').append(newRow);
                buttonIndex++;
                updateHiddenField();
            });

            // Remove button
            $(document).on('click', '.qa-remove-btn', function() {
                $(this).closest('tr').remove();
                updateHiddenField();
            });

            // Update on any change
            $(document).on('change keyup', '.qa-emoji, .qa-label, .qa-action-type, .qa-payload', function() {
                updateHiddenField();
            });

            // Initial update
            updateHiddenField();
        });
        </script>
        <?php
    }

    // === AI Config Field Callbacks ===

    /**
     * AI Config section callback
     */
    public function aiConfigSectionCallback() {
        echo '<p>' . __('Configure cómo se muestran los mensajes generados por el asistente de IA en el chat.', 'guiders-wp-plugin') . '</p>';
        echo '<p class="description">' . __('El procesamiento de IA se realiza en el backend. Estas opciones controlan solo la visualización en el chat del visitante.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * AI enabled field callback
     */
    public function aiEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['ai_enabled']) ? $settings['ai_enabled'] : true;

        echo '<input type="checkbox" id="ai_enabled" name="guiders_wp_plugin_settings[ai_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="ai_enabled">' . __('Habilitar visualización de mensajes de IA', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está desactivado, los mensajes de IA se mostrarán como mensajes normales sin indicador especial.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * AI show indicator field callback
     */
    public function aiShowIndicatorFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show = isset($settings['ai_show_indicator']) ? $settings['ai_show_indicator'] : true;

        echo '<input type="checkbox" id="ai_show_indicator" name="guiders_wp_plugin_settings[ai_show_indicator]" value="1" ' . checked($show, true, false) . ' />';
        echo '<label for="ai_show_indicator">' . __('Mostrar badge "IA" en los mensajes generados por IA', 'guiders-wp-plugin') . '</label>';
    }

    /**
     * AI sender name field callback
     */
    public function aiSenderNameFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $name = isset($settings['ai_sender_name']) ? $settings['ai_sender_name'] : 'Asistente IA';

        echo '<input type="text" id="ai_sender_name" name="guiders_wp_plugin_settings[ai_sender_name]" value="' . esc_attr($name) . '" class="regular-text" />';
        echo '<p class="description">' . __('Nombre que aparece como remitente de los mensajes de IA.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * AI show typing indicator field callback
     */
    public function aiShowTypingIndicatorFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show = isset($settings['ai_show_typing_indicator']) ? $settings['ai_show_typing_indicator'] : true;

        echo '<input type="checkbox" id="ai_show_typing_indicator" name="guiders_wp_plugin_settings[ai_show_typing_indicator]" value="1" ' . checked($show, true, false) . ' />';
        echo '<label for="ai_show_typing_indicator">' . __('Mostrar indicador "IA está escribiendo..." mientras genera respuesta', 'guiders-wp-plugin') . '</label>';
    }

    // === Chat Selector Field Callbacks ===

    /**
     * Chat Selector section callback
     */
    public function chatSelectorSectionCallback() {
        echo '<p>' . __('Configure el selector de conversaciones para permitir a los visitantes gestionar múltiples chats.', 'guiders-wp-plugin') . '</p>';
        echo '<p class="description">' . __('El selector aparece en el encabezado del chat y permite cambiar entre conversaciones o iniciar una nueva.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat Selector enabled field callback
     */
    public function chatSelectorEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['chat_selector_enabled']) ? $settings['chat_selector_enabled'] : false;

        echo '<input type="checkbox" id="chat_selector_enabled" name="guiders_wp_plugin_settings[chat_selector_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="chat_selector_enabled">' . __('Habilitar selector de conversaciones', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, los visitantes podrán ver y cambiar entre sus conversaciones anteriores.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat Selector new chat label field callback
     */
    public function chatSelectorNewChatLabelFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $label = isset($settings['chat_selector_new_chat_label']) ? $settings['chat_selector_new_chat_label'] : 'Nueva conversación';

        echo '<input type="text" id="chat_selector_new_chat_label" name="guiders_wp_plugin_settings[chat_selector_new_chat_label]" value="' . esc_attr($label) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del botón para iniciar una nueva conversación.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat Selector new chat emoji field callback
     */
    public function chatSelectorNewChatEmojiFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $emoji = isset($settings['chat_selector_new_chat_emoji']) ? $settings['chat_selector_new_chat_emoji'] : '+';

        echo '<input type="text" id="chat_selector_new_chat_emoji" name="guiders_wp_plugin_settings[chat_selector_new_chat_emoji]" value="' . esc_attr($emoji) . '" style="width: 60px; text-align: center; font-size: 18px;" />';
        echo '<p class="description">' . __('Emoji o símbolo para el botón de nueva conversación. Ejemplos: + ✨ 💬 📝', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat Selector max chats field callback
     */
    public function chatSelectorMaxChatsFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $max_chats = isset($settings['chat_selector_max_chats']) ? $settings['chat_selector_max_chats'] : 10;

        echo '<input type="number" id="chat_selector_max_chats" name="guiders_wp_plugin_settings[chat_selector_max_chats]" value="' . esc_attr($max_chats) . '" min="1" max="50" />';
        echo '<p class="description">' . __('Número máximo de conversaciones a mostrar en el selector (1-50).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat Selector empty message field callback
     */
    public function chatSelectorEmptyMessageFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $message = isset($settings['chat_selector_empty_message']) ? $settings['chat_selector_empty_message'] : 'No hay conversaciones anteriores';

        echo '<input type="text" id="chat_selector_empty_message" name="guiders_wp_plugin_settings[chat_selector_empty_message]" value="' . esc_attr($message) . '" class="regular-text" />';
        echo '<p class="description">' . __('Mensaje que se muestra cuando no hay conversaciones previas.', 'guiders-wp-plugin') . '</p>';
    }

    // === Tracking V2 Field Callbacks ===

    /**
     * Tracking V2 section callback
     */
    public function trackingV2SectionCallback() {
        echo '<p>' . __('Configure el sistema avanzado de tracking V2 con cola persistente y envío por lotes.', 'guiders-wp-plugin') . '</p>';
        echo '<p class="description">' . __('El sistema Tracking V2 mejora la fiabilidad del tracking mediante batching, persistencia en localStorage y reintentos automáticos.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 enabled field callback
     */
    public function trackingV2EnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['tracking_v2_enabled']) ? $settings['tracking_v2_enabled'] : true;

        echo '<input type="checkbox" id="tracking_v2_enabled" name="guiders_wp_plugin_settings[tracking_v2_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="tracking_v2_enabled">' . __('Activar sistema de tracking V2', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, los eventos se enviarán usando el sistema V2 con cola persistente y batching.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 batch size field callback
     */
    public function trackingV2BatchSizeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $batch_size = isset($settings['tracking_v2_batch_size']) ? $settings['tracking_v2_batch_size'] : 500;

        echo '<input type="number" id="tracking_v2_batch_size" name="guiders_wp_plugin_settings[tracking_v2_batch_size]" value="' . esc_attr($batch_size) . '" min="100" max="1000" step="50" />';
        echo '<p class="description">' . __('Número de eventos a enviar en cada lote (100-1000). Recomendado: 500.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 flush interval field callback
     */
    public function trackingV2FlushIntervalFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $flush_interval = isset($settings['tracking_v2_flush_interval']) ? $settings['tracking_v2_flush_interval'] : 5000;

        echo '<input type="number" id="tracking_v2_flush_interval" name="guiders_wp_plugin_settings[tracking_v2_flush_interval]" value="' . esc_attr($flush_interval) . '" min="1000" max="30000" step="1000" />';
        echo '<p class="description">' . __('Intervalo en milisegundos para enviar eventos (1000-30000 ms). Recomendado: 5000 (5 segundos).', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 max queue size field callback
     */
    public function trackingV2MaxQueueSizeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $max_queue = isset($settings['tracking_v2_max_queue_size']) ? $settings['tracking_v2_max_queue_size'] : 10000;

        echo '<input type="number" id="tracking_v2_max_queue_size" name="guiders_wp_plugin_settings[tracking_v2_max_queue_size]" value="' . esc_attr($max_queue) . '" min="1000" max="50000" step="1000" />';
        echo '<p class="description">' . __('Tamaño máximo de la cola de eventos (1000-50000). Recomendado: 10000.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 persist queue field callback
     */
    public function trackingV2PersistQueueFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $persist_queue = isset($settings['tracking_v2_persist_queue']) ? $settings['tracking_v2_persist_queue'] : true;

        echo '<input type="checkbox" id="tracking_v2_persist_queue" name="guiders_wp_plugin_settings[tracking_v2_persist_queue]" value="1" ' . checked($persist_queue, true, false) . ' />';
        echo '<label for="tracking_v2_persist_queue">' . __('Guardar cola en localStorage', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Si está activado, los eventos pendientes se guardarán en localStorage y se enviarán tras recargar la página.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Tracking V2 bypass consent field callback
     */
    public function trackingV2BypassConsentFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $bypass_consent = isset($settings['tracking_v2_bypass_consent']) ? $settings['tracking_v2_bypass_consent'] : false;
        $environment = isset($settings['environment']) ? $settings['environment'] : 'production';

        echo '<input type="checkbox" id="tracking_v2_bypass_consent" name="guiders_wp_plugin_settings[tracking_v2_bypass_consent]" value="1" ' . checked($bypass_consent, true, false) . ' />';
        echo '<label for="tracking_v2_bypass_consent">' . __('Omitir verificación de consentimiento', 'guiders-wp-plugin') . '</label>';

        // Show warning if not in development environment
        if ($environment !== 'development') {
            echo '<p class="description" style="color: #d63638; font-weight: bold;">' . __('⚠️ ADVERTENCIA: Esta opción está diseñada SOLO para desarrollo. No debe activarse en producción.', 'guiders-wp-plugin') . '</p>';
        } else {
            echo '<p class="description">' . __('⚠️ Solo para desarrollo: permite tracking sin consentimiento GDPR. No usar en producción.', 'guiders-wp-plugin') . '</p>';
        }
    }

    // === Chat Position Field Callbacks ===

    /**
     * Chat position section callback
     */
    public function chatPositionSectionCallback() {
        echo '<p>' . __('Configura la posición del widget de chat y el botón flotante. Puedes usar configuraciones diferentes para escritorio y móvil.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Chat position field callback - Modern UI with tabs and modes
     */
    public function chatPositionFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $position_data = isset($settings['chat_position_data']) ? $settings['chat_position_data'] : '{}';
        $position = json_decode($position_data, true);
        if (!is_array($position)) {
            $position = array();
        }

        // Default values
        $desktop_mode = isset($position['desktop']['mode']) ? $position['desktop']['mode'] : 'basic';
        $desktop_preset = isset($position['desktop']['preset']) ? $position['desktop']['preset'] : 'bottom-right';
        $desktop_button = isset($position['desktop']['button']) ? $position['desktop']['button'] : array('bottom' => '20px', 'right' => '20px');
        $desktop_widget = isset($position['desktop']['widget']) ? $position['desktop']['widget'] : array('auto' => true);

        $mobile_enabled = isset($position['mobile']['enabled']) ? $position['mobile']['enabled'] : false;
        $mobile_mode = isset($position['mobile']['mode']) ? $position['mobile']['mode'] : 'basic';
        $mobile_preset = isset($position['mobile']['preset']) ? $position['mobile']['preset'] : 'bottom-right';
        $mobile_button = isset($position['mobile']['button']) ? $position['mobile']['button'] : array('bottom' => '20px', 'right' => '20px');
        $mobile_widget = isset($position['mobile']['widget']) ? $position['mobile']['widget'] : array('auto' => true);

        // Hidden input to store JSON data
        echo '<input type="hidden" id="chat_position_data" name="guiders_wp_plugin_settings[chat_position_data]" value="' . esc_attr($position_data) . '" />';

        // Modern UI
        ?>
        <div id="guiders-chat-position-ui" class="guiders-position-ui">
            <!-- Device Tabs -->
            <div class="guiders-tabs">
                <button type="button" class="guiders-tab active" data-tab="desktop">
                    <span class="dashicons dashicons-desktop"></span> <?php _e('Escritorio', 'guiders-wp-plugin'); ?>
                </button>
                <button type="button" class="guiders-tab" data-tab="mobile">
                    <span class="dashicons dashicons-smartphone"></span> <?php _e('Móvil', 'guiders-wp-plugin'); ?>
                </button>
            </div>

            <!-- Desktop Tab Content -->
            <div class="guiders-tab-content active" data-content="desktop">
                <!-- Mode Selector -->
                <div class="guiders-mode-selector">
                    <label class="guiders-mode-option">
                        <input type="radio" name="desktop_mode" value="basic" <?php checked($desktop_mode, 'basic'); ?> />
                        <span><?php _e('Básico (Presets)', 'guiders-wp-plugin'); ?></span>
                    </label>
                    <label class="guiders-mode-option">
                        <input type="radio" name="desktop_mode" value="advanced" <?php checked($desktop_mode, 'advanced'); ?> />
                        <span><?php _e('Avanzado (Coordenadas)', 'guiders-wp-plugin'); ?></span>
                    </label>
                </div>

                <!-- Basic Mode (Presets) -->
                <div class="guiders-basic-mode" style="display: <?php echo $desktop_mode === 'basic' ? 'block' : 'none'; ?>;">
                    <h4><?php _e('Selecciona una posición:', 'guiders-wp-plugin'); ?></h4>
                    <div class="guiders-preset-grid">
                        <div class="guiders-preset-card <?php echo $desktop_preset === 'top-left' ? 'active' : ''; ?>" data-preset="top-left">
                            <div class="preset-icon"><span class="dashicons dashicons-arrow-up-left"></span></div>
                            <div class="preset-label"><?php _e('Superior Izquierda', 'guiders-wp-plugin'); ?></div>
                        </div>
                        <div class="guiders-preset-card <?php echo $desktop_preset === 'top-right' ? 'active' : ''; ?>" data-preset="top-right">
                            <div class="preset-icon"><span class="dashicons dashicons-arrow-up-right"></span></div>
                            <div class="preset-label"><?php _e('Superior Derecha', 'guiders-wp-plugin'); ?></div>
                        </div>
                        <div class="guiders-preset-card <?php echo $desktop_preset === 'bottom-left' ? 'active' : ''; ?>" data-preset="bottom-left">
                            <div class="preset-icon"><span class="dashicons dashicons-arrow-down-left"></span></div>
                            <div class="preset-label"><?php _e('Inferior Izquierda', 'guiders-wp-plugin'); ?></div>
                        </div>
                        <div class="guiders-preset-card <?php echo $desktop_preset === 'bottom-right' ? 'active' : ''; ?>" data-preset="bottom-right">
                            <div class="preset-icon"><span class="dashicons dashicons-arrow-down-right"></span></div>
                            <div class="preset-label"><?php _e('Inferior Derecha', 'guiders-wp-plugin'); ?></div>
                        </div>
                    </div>
                </div>

                <!-- Advanced Mode (Coordinates) -->
                <div class="guiders-advanced-mode" style="display: <?php echo $desktop_mode === 'advanced' ? 'block' : 'none'; ?>;">
                    <h4><?php _e('Posición del Botón:', 'guiders-wp-plugin'); ?></h4>
                    <div class="guiders-coords-grid">
                        <div>
                            <label><?php _e('Top:', 'guiders-wp-plugin'); ?></label>
                            <input type="text" class="coord-input" data-coord="button.top" value="<?php echo isset($desktop_button['top']) ? esc_attr($desktop_button['top']) : ''; ?>" placeholder="ej: 20px" />
                        </div>
                        <div>
                            <label><?php _e('Bottom:', 'guiders-wp-plugin'); ?></label>
                            <input type="text" class="coord-input" data-coord="button.bottom" value="<?php echo isset($desktop_button['bottom']) ? esc_attr($desktop_button['bottom']) : ''; ?>" placeholder="ej: 20px" />
                        </div>
                        <div>
                            <label><?php _e('Left:', 'guiders-wp-plugin'); ?></label>
                            <input type="text" class="coord-input" data-coord="button.left" value="<?php echo isset($desktop_button['left']) ? esc_attr($desktop_button['left']) : ''; ?>" placeholder="ej: 20px" />
                        </div>
                        <div>
                            <label><?php _e('Right:', 'guiders-wp-plugin'); ?></label>
                            <input type="text" class="coord-input" data-coord="button.right" value="<?php echo isset($desktop_button['right']) ? esc_attr($desktop_button['right']) : ''; ?>" placeholder="ej: 20px" />
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <label>
                            <input type="checkbox" class="widget-auto-checkbox" <?php checked(isset($desktop_widget['auto']) && $desktop_widget['auto']); ?> />
                            <?php _e('Calcular posición del widget automáticamente', 'guiders-wp-plugin'); ?>
                        </label>
                    </div>

                    <div class="guiders-widget-coords" style="display: <?php echo (isset($desktop_widget['auto']) && $desktop_widget['auto']) ? 'none' : 'block'; ?>; margin-top: 15px;">
                        <h4><?php _e('Posición del Widget (Opcional):', 'guiders-wp-plugin'); ?></h4>
                        <div class="guiders-coords-grid">
                            <div>
                                <label><?php _e('Top:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="widget.top" value="<?php echo isset($desktop_widget['top']) ? esc_attr($desktop_widget['top']) : ''; ?>" placeholder="ej: 90px" />
                            </div>
                            <div>
                                <label><?php _e('Bottom:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="widget.bottom" value="<?php echo isset($desktop_widget['bottom']) ? esc_attr($desktop_widget['bottom']) : ''; ?>" placeholder="ej: 90px" />
                            </div>
                            <div>
                                <label><?php _e('Left:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="widget.left" value="<?php echo isset($desktop_widget['left']) ? esc_attr($desktop_widget['left']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                            <div>
                                <label><?php _e('Right:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="widget.right" value="<?php echo isset($desktop_widget['right']) ? esc_attr($desktop_widget['right']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Tab Content -->
            <div class="guiders-tab-content" data-content="mobile">
                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" id="mobile_enabled" <?php checked($mobile_enabled); ?> />
                        <?php _e('Usar configuración diferente para móvil', 'guiders-wp-plugin'); ?>
                    </label>
                    <p class="description"><?php _e('Si está desactivado, se usará la configuración de escritorio también en móvil.', 'guiders-wp-plugin'); ?></p>
                </div>

                <div id="mobile_config" style="display: <?php echo $mobile_enabled ? 'block' : 'none'; ?>;">
                    <!-- Mode Selector -->
                    <div class="guiders-mode-selector">
                        <label class="guiders-mode-option">
                            <input type="radio" name="mobile_mode" value="basic" <?php checked($mobile_mode, 'basic'); ?> />
                            <span><?php _e('Básico (Presets)', 'guiders-wp-plugin'); ?></span>
                        </label>
                        <label class="guiders-mode-option">
                            <input type="radio" name="mobile_mode" value="advanced" <?php checked($mobile_mode, 'advanced'); ?> />
                            <span><?php _e('Avanzado (Coordenadas)', 'guiders-wp-plugin'); ?></span>
                        </label>
                    </div>

                    <!-- Basic Mode (Presets) -->
                    <div class="guiders-basic-mode" style="display: <?php echo $mobile_mode === 'basic' ? 'block' : 'none'; ?>;">
                        <h4><?php _e('Selecciona una posición:', 'guiders-wp-plugin'); ?></h4>
                        <div class="guiders-preset-grid">
                            <div class="guiders-preset-card <?php echo $mobile_preset === 'top-left' ? 'active' : ''; ?>" data-preset="top-left">
                                <div class="preset-icon"><span class="dashicons dashicons-arrow-up-left"></span></div>
                                <div class="preset-label"><?php _e('Superior Izquierda', 'guiders-wp-plugin'); ?></div>
                            </div>
                            <div class="guiders-preset-card <?php echo $mobile_preset === 'top-right' ? 'active' : ''; ?>" data-preset="top-right">
                                <div class="preset-icon"><span class="dashicons dashicons-arrow-up-right"></span></div>
                                <div class="preset-label"><?php _e('Superior Derecha', 'guiders-wp-plugin'); ?></div>
                            </div>
                            <div class="guiders-preset-card <?php echo $mobile_preset === 'bottom-left' ? 'active' : ''; ?>" data-preset="bottom-left">
                                <div class="preset-icon"><span class="dashicons dashicons-arrow-down-left"></span></div>
                                <div class="preset-label"><?php _e('Inferior Izquierda', 'guiders-wp-plugin'); ?></div>
                            </div>
                            <div class="guiders-preset-card <?php echo $mobile_preset === 'bottom-right' ? 'active' : ''; ?>" data-preset="bottom-right">
                                <div class="preset-icon"><span class="dashicons dashicons-arrow-down-right"></span></div>
                                <div class="preset-label"><?php _e('Inferior Derecha', 'guiders-wp-plugin'); ?></div>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Mode (Coordinates) - Similar structure as desktop -->
                    <div class="guiders-advanced-mode" style="display: <?php echo $mobile_mode === 'advanced' ? 'block' : 'none'; ?>;">
                        <h4><?php _e('Posición del Botón:', 'guiders-wp-plugin'); ?></h4>
                        <div class="guiders-coords-grid">
                            <div>
                                <label><?php _e('Top:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="button.top" value="<?php echo isset($mobile_button['top']) ? esc_attr($mobile_button['top']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                            <div>
                                <label><?php _e('Bottom:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="button.bottom" value="<?php echo isset($mobile_button['bottom']) ? esc_attr($mobile_button['bottom']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                            <div>
                                <label><?php _e('Left:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="button.left" value="<?php echo isset($mobile_button['left']) ? esc_attr($mobile_button['left']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                            <div>
                                <label><?php _e('Right:', 'guiders-wp-plugin'); ?></label>
                                <input type="text" class="coord-input" data-coord="button.right" value="<?php echo isset($mobile_button['right']) ? esc_attr($mobile_button['right']) : ''; ?>" placeholder="ej: 20px" />
                            </div>
                        </div>

                        <div style="margin-top: 20px;">
                            <label>
                                <input type="checkbox" class="widget-auto-checkbox" <?php checked(isset($mobile_widget['auto']) && $mobile_widget['auto']); ?> />
                                <?php _e('Calcular posición del widget automáticamente', 'guiders-wp-plugin'); ?>
                            </label>
                        </div>

                        <div class="guiders-widget-coords" style="display: <?php echo (isset($mobile_widget['auto']) && $mobile_widget['auto']) ? 'none' : 'block'; ?>; margin-top: 15px;">
                            <h4><?php _e('Posición del Widget (Opcional):', 'guiders-wp-plugin'); ?></h4>
                            <div class="guiders-coords-grid">
                                <div>
                                    <label><?php _e('Top:', 'guiders-wp-plugin'); ?></label>
                                    <input type="text" class="coord-input" data-coord="widget.top" value="<?php echo isset($mobile_widget['top']) ? esc_attr($mobile_widget['top']) : ''; ?>" placeholder="ej: 90px" />
                                </div>
                                <div>
                                    <label><?php _e('Bottom:', 'guiders-wp-plugin'); ?></label>
                                    <input type="text" class="coord-input" data-coord="widget.bottom" value="<?php echo isset($mobile_widget['bottom']) ? esc_attr($mobile_widget['bottom']) : ''; ?>" placeholder="ej: 90px" />
                                </div>
                                <div>
                                    <label><?php _e('Left:', 'guiders-wp-plugin'); ?></label>
                                    <input type="text" class="coord-input" data-coord="widget.left" value="<?php echo isset($mobile_widget['left']) ? esc_attr($mobile_widget['left']) : ''; ?>" placeholder="ej: 20px" />
                                </div>
                                <div>
                                    <label><?php _e('Right:', 'guiders-wp-plugin'); ?></label>
                                    <input type="text" class="coord-input" data-coord="widget.right" value="<?php echo isset($mobile_widget['right']) ? esc_attr($mobile_widget['right']) : ''; ?>" placeholder="ej: 20px" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preview -->
            <div class="guiders-preview">
                <h4><?php _e('Vista Previa:', 'guiders-wp-plugin'); ?></h4>
                <div class="guiders-preview-box">
                    <div class="preview-button" style="bottom: 20px; right: 20px;"></div>
                    <div class="preview-widget" style="display: none; bottom: 90px; right: 20px;"></div>
                </div>
                <p class="description"><?php _e('Simulación aproximada. La posición exacta puede variar según el tema de WordPress.', 'guiders-wp-plugin'); ?></p>
            </div>
        </div>

        <style>
        .guiders-position-ui {
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-top: 10px;
        }

        .guiders-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }

        .guiders-tab {
            background: transparent;
            border: none;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #555;
            border-bottom: 3px solid transparent;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .guiders-tab:hover {
            color: #0073aa;
            background: #f0f0f1;
        }

        .guiders-tab.active {
            color: #0073aa;
            border-bottom-color: #0073aa;
            background: white;
        }

        .guiders-tab-content {
            display: none;
        }

        .guiders-tab-content.active {
            display: block;
        }

        .guiders-mode-selector {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #ddd;
        }

        .guiders-mode-option {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 10px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }

        .guiders-mode-option:hover {
            background: #f0f0f1;
        }

        .guiders-preset-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
        }

        .guiders-preset-card {
            background: white;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .guiders-preset-card:hover {
            border-color: #0073aa;
            box-shadow: 0 2px 8px rgba(0,115,170,0.1);
        }

        .guiders-preset-card.active {
            border-color: #0073aa;
            background: #e5f5ff;
        }

        .preset-icon {
            font-size: 32px;
            color: #0073aa;
            margin-bottom: 10px;
        }

        .preset-label {
            font-weight: 500;
            color: #333;
        }

        .guiders-coords-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #ddd;
        }

        .guiders-coords-grid > div {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .guiders-coords-grid label {
            font-weight: 500;
            color: #555;
        }

        .coord-input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .guiders-preview {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }

        .guiders-preview-box {
            position: relative;
            width: 100%;
            height: 300px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            margin-top: 15px;
            overflow: hidden;
        }

        .preview-button {
            position: absolute;
            width: 56px;
            height: 56px;
            background: linear-gradient(145deg, #0084ff, #0062cc);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .preview-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }

        .preview-widget {
            position: absolute;
            width: 340px;
            height: 520px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
            .guiders-preset-grid,
            .guiders-coords-grid {
                grid-template-columns: 1fr;
            }

            .preview-widget {
                width: 280px;
                height: 420px;
            }
        }
        </style>

        <script>
        jQuery(document).ready(function($) {
            var currentDevice = 'desktop';
            var positionData = <?php echo $position_data; ?>;

            // Initialize if empty
            if (!positionData.desktop) {
                positionData = {
                    desktop: {
                        mode: 'basic',
                        preset: 'bottom-right',
                        button: {bottom: '20px', right: '20px'},
                        widget: {auto: true}
                    },
                    mobile: {
                        enabled: false,
                        mode: 'basic',
                        preset: 'bottom-right',
                        button: {bottom: '20px', right: '20px'},
                        widget: {auto: true}
                    }
                };
            }

            // Tab switching
            $('.guiders-tab').click(function() {
                var tab = $(this).data('tab');
                currentDevice = tab;

                $('.guiders-tab').removeClass('active');
                $(this).addClass('active');

                $('.guiders-tab-content').removeClass('active');
                $('.guiders-tab-content[data-content="' + tab + '"]').addClass('active');

                updatePreview();
            });

            // Mode switching
            $('input[name="desktop_mode"], input[name="mobile_mode"]').change(function() {
                var device = $(this).attr('name').replace('_mode', '');
                var mode = $(this).val();
                var container = $('[data-content="' + device + '"]');

                if (mode === 'basic') {
                    container.find('.guiders-basic-mode').show();
                    container.find('.guiders-advanced-mode').hide();
                } else {
                    container.find('.guiders-basic-mode').hide();
                    container.find('.guiders-advanced-mode').show();
                }

                positionData[device].mode = mode;
                savePositionData();
                updatePreview();
            });

            // Preset selection
            $('.guiders-preset-card').click(function() {
                var preset = $(this).data('preset');
                var device = $(this).closest('.guiders-tab-content').data('content');

                $(this).closest('.guiders-preset-grid').find('.guiders-preset-card').removeClass('active');
                $(this).addClass('active');

                positionData[device].preset = preset;
                savePositionData();
                updatePreview();
            });

            // Coordinate inputs
            $('.coord-input').on('input', function() {
                var device = $(this).closest('.guiders-tab-content').data('content');
                var coord = $(this).data('coord');
                var value = $(this).val().trim();

                var parts = coord.split('.');
                if (!positionData[device][parts[0]]) {
                    positionData[device][parts[0]] = {};
                }

                if (value) {
                    positionData[device][parts[0]][parts[1]] = value;
                } else {
                    delete positionData[device][parts[0]][parts[1]];
                }

                savePositionData();
                updatePreview();
            });

            // Widget auto checkbox
            $('.widget-auto-checkbox').change(function() {
                var device = $(this).closest('.guiders-tab-content').data('content');
                var isAuto = $(this).is(':checked');
                var container = $(this).closest('.guiders-tab-content');

                positionData[device].widget = isAuto ? {auto: true} : {};

                container.find('.guiders-widget-coords').toggle(!isAuto);
                savePositionData();
                updatePreview();
            });

            // Mobile enabled checkbox
            $('#mobile_enabled').change(function() {
                var enabled = $(this).is(':checked');
                $('#mobile_config').toggle(enabled);
                positionData.mobile.enabled = enabled;
                savePositionData();
            });

            function savePositionData() {
                $('#chat_position_data').val(JSON.stringify(positionData));
            }

            function updatePreview() {
                var device = positionData[currentDevice];
                var position = {bottom: '20px', right: '20px'};

                if (device.mode === 'basic') {
                    // Map presets to coordinates
                    switch(device.preset) {
                        case 'top-left':
                            position = {top: '20px', left: '20px'};
                            break;
                        case 'top-right':
                            position = {top: '20px', right: '20px'};
                            break;
                        case 'bottom-left':
                            position = {bottom: '20px', left: '20px'};
                            break;
                        case 'bottom-right':
                        default:
                            position = {bottom: '20px', right: '20px'};
                            break;
                    }
                } else {
                    position = device.button || {bottom: '20px', right: '20px'};
                }

                // Apply to preview button
                $('.preview-button').css({
                    top: position.top || 'auto',
                    bottom: position.bottom || 'auto',
                    left: position.left || 'auto',
                    right: position.right || 'auto'
                });
            }

            // Initial update
            updatePreview();
        });
        </script>
        <?php
    }

    // === Mobile Detection Field Callbacks ===

    /**
     * Mobile breakpoint field callback
     */
    public function mobileBreakpointFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $breakpoint = isset($settings['mobile_breakpoint']) ? $settings['mobile_breakpoint'] : '768';

        echo '<select id="mobile_breakpoint" name="guiders_wp_plugin_settings[mobile_breakpoint]">';
        $options = array(
            '640' => '640px - ' . __('Móviles pequeños', 'guiders-wp-plugin'),
            '768' => '768px - ' . __('Tablets y móviles (por defecto)', 'guiders-wp-plugin'),
            '992' => '992px - ' . __('Tablets grandes', 'guiders-wp-plugin'),
            '1024' => '1024px - ' . __('iPads y tablets grandes', 'guiders-wp-plugin'),
        );

        foreach ($options as $value => $label) {
            echo '<option value="' . esc_attr($value) . '"' . selected($breakpoint, $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Ancho máximo de pantalla (en píxeles) para considerar un dispositivo como móvil. Usa 768px para móviles estándar o 1024px para incluir tablets.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Mobile detection mode field callback
     */
    public function mobileDetectionModeFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $mode = isset($settings['mobile_detection_mode']) ? $settings['mobile_detection_mode'] : 'auto';

        echo '<div style="display: flex; flex-direction: column; gap: 10px;">';

        $modes = array(
            'auto' => array(
                'label' => __('Auto (Recomendado)', 'guiders-wp-plugin'),
                'description' => __('Combina múltiples métodos: tamaño de pantalla, capacidad táctil, orientación y user agent.', 'guiders-wp-plugin')
            ),
            'size-only' => array(
                'label' => __('Solo Tamaño', 'guiders-wp-plugin'),
                'description' => __('Detecta móviles únicamente por el ancho de pantalla configurado arriba.', 'guiders-wp-plugin')
            ),
            'touch-only' => array(
                'label' => __('Solo Táctil', 'guiders-wp-plugin'),
                'description' => __('Detecta dispositivos con pantalla táctil como método principal de entrada.', 'guiders-wp-plugin')
            ),
            'user-agent-only' => array(
                'label' => __('Solo User Agent', 'guiders-wp-plugin'),
                'description' => __('Detecta móviles solo por el User Agent del navegador (método tradicional).', 'guiders-wp-plugin')
            ),
        );

        foreach ($modes as $value => $info) {
            echo '<label style="display: flex; align-items: flex-start; gap: 8px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">';
            echo '<input type="radio" name="guiders_wp_plugin_settings[mobile_detection_mode]" value="' . esc_attr($value) . '"' . checked($mode, $value, false) . ' />';
            echo '<div>';
            echo '<strong>' . esc_html($info['label']) . '</strong>';
            echo '<p class="description" style="margin: 5px 0 0 0;">' . esc_html($info['description']) . '</p>';
            echo '</div>';
            echo '</label>';
        }

        echo '</div>';
    }

    /**
     * Mobile detection debug field callback
     */
    public function mobileDetectionDebugFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $debug = isset($settings['mobile_detection_debug']) ? $settings['mobile_detection_debug'] : false;

        echo '<label>';
        echo '<input type="checkbox" id="mobile_detection_debug" name="guiders_wp_plugin_settings[mobile_detection_debug]" value="1"' . checked($debug, 1, false) . ' />';
        echo ' ' . __('Activar logs de debug en la consola del navegador', 'guiders-wp-plugin');
        echo '</label>';
        echo '<p class="description">' . __('Muestra información detallada en la consola sobre qué método detectó el dispositivo como móvil, el tamaño del viewport y el breakpoint utilizado. Útil para diagnosticar problemas de detección.', 'guiders-wp-plugin') . '</p>';
    }

    // === GDPR & Consent Banner Field Callbacks ===

    /**
     * GDPR section callback
     */
    public function gdprSectionCallback() {
        echo '<div class="notice notice-info inline">';
        echo '<p><strong>⚠️ Importante:</strong> Por defecto, el SDK funciona sin requerir consentimiento GDPR (<code>requireConsent: false</code>).</p>';
        echo '<p>Esta sección es <strong>solo para sitios de la UE</strong> que necesitan cumplimiento GDPR/LOPDGDD.</p>';
        echo '<p>Si no estás en la UE, puedes dejar estas opciones desactivadas y el SDK funcionará inmediatamente.</p>';
        echo '</div>';
        echo '<p>' . __('Configura el banner de consentimiento GDPR integrado. El banner se mostrará automáticamente cuando actives ambas opciones a continuación.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent banner enabled field callback
     */
    public function consentBannerEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['consent_banner_enabled']) ? $settings['consent_banner_enabled'] : false;
        $requireConsent = isset($settings['require_consent']) ? $settings['require_consent'] : false;

        echo '<input type="checkbox" id="consent_banner_enabled" name="guiders_wp_plugin_settings[consent_banner_enabled]" value="1" ' . checked($enabled, true, false) . ' />';
        echo '<label for="consent_banner_enabled">' . __('Mostrar banner de consentimiento automáticamente', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">';
        echo '<strong>⚠️ IMPORTANTE:</strong> Este banner solo se mostrará si también activas "Requerir Consentimiento GDPR" abajo. ';
        echo __('Si está desactivado, deberás implementar tu propio banner o usar un plugin de terceros (Complianz, CookieYes, etc.).', 'guiders-wp-plugin');
        echo '</p>';

        // Show warning if banner is enabled but requireConsent is not
        if ($enabled && !$requireConsent) {
            echo '<div class="notice notice-warning inline" style="margin-top:10px; padding: 10px;">';
            echo '<p style="margin:0;"><strong>⚠️ Advertencia:</strong> Has activado el banner pero "Requerir Consentimiento GDPR" está desactivado. El banner NO se mostrará hasta que actives ambas opciones.</p>';
            echo '</div>';
        }
    }

    /**
     * Require consent field callback
     */
    public function requireConsentFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $require_consent = isset($settings['require_consent']) ? $settings['require_consent'] : false;

        echo '<input type="checkbox" id="require_consent" name="guiders_wp_plugin_settings[require_consent]" value="1" ' . checked($require_consent, true, false) . ' />';
        echo '<label for="require_consent">' . __('Requerir consentimiento del usuario antes de inicializar el SDK', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">';
        echo '<strong>' . __('✅ Activado (recomendado para sitios en EU):', 'guiders-wp-plugin') . '</strong> ';
        echo __('El SDK no se inicializará hasta que el usuario otorgue consentimiento. Cumple con GDPR/LOPDGDD.', 'guiders-wp-plugin');
        echo '<br>';
        echo '<strong>' . __('❌ Desactivado:', 'guiders-wp-plugin') . '</strong> ';
        echo __('El SDK se inicializa inmediatamente sin esperar consentimiento. Útil para sitios fuera de la UE o que usan otro sistema de consentimiento.', 'guiders-wp-plugin');
        echo '</p>';
    }

    /**
     * Consent banner style field callback
     */
    public function consentBannerStyleFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $style = isset($settings['consent_banner_style']) ? $settings['consent_banner_style'] : 'bottom_bar';

        $styles = array(
            'bottom_bar' => __('Barra inferior (recomendado)', 'guiders-wp-plugin'),
            'modal' => __('Modal centrado', 'guiders-wp-plugin'),
            'corner' => __('Esquina inferior derecha', 'guiders-wp-plugin')
        );

        echo '<select id="consent_banner_style" name="guiders_wp_plugin_settings[consent_banner_style]">';
        foreach ($styles as $value => $label) {
            echo '<option value="' . esc_attr($value) . '" ' . selected($style, $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Elige el estilo de presentación del banner.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent banner text field callback
     */
    public function consentBannerTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['consent_banner_text']) ? $settings['consent_banner_text'] : '🍪 Usamos cookies para mejorar tu experiencia y proporcionar chat en vivo.';

        echo '<textarea id="consent_banner_text" name="guiders_wp_plugin_settings[consent_banner_text]" rows="3" cols="50" class="large-text">' . esc_textarea($text) . '</textarea>';
        echo '<p class="description">' . __('Texto que se mostrará en el banner de consentimiento.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent accept text field callback
     */
    public function consentAcceptTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['consent_accept_text']) ? $settings['consent_accept_text'] : 'Aceptar Todo';

        echo '<input type="text" id="consent_accept_text" name="guiders_wp_plugin_settings[consent_accept_text]" value="' . esc_attr($text) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del botón para aceptar todas las cookies.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent deny text field callback
     */
    public function consentDenyTextFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $text = isset($settings['consent_deny_text']) ? $settings['consent_deny_text'] : 'Rechazar';

        echo '<input type="text" id="consent_deny_text" name="guiders_wp_plugin_settings[consent_deny_text]" value="' . esc_attr($text) . '" class="regular-text" />';
        echo '<p class="description">' . __('Texto del botón para rechazar cookies no esenciales.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent show preferences field callback
     */
    public function consentShowPreferencesFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $show = isset($settings['consent_show_preferences']) ? $settings['consent_show_preferences'] : true;

        echo '<input type="checkbox" id="consent_show_preferences" name="guiders_wp_plugin_settings[consent_show_preferences]" value="1" ' . checked($show, true, false) . ' />';
        echo '<label for="consent_show_preferences">' . __('Mostrar botón de preferencias en el banner', 'guiders-wp-plugin') . '</label>';
        echo '<p class="description">' . __('Permite al usuario configurar qué categorías de cookies acepta.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Consent banner colors field callback
     */
    public function consentBannerColorsFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());

        $bg_color = isset($settings['consent_banner_bg_color']) ? $settings['consent_banner_bg_color'] : '#2c3e50';
        $text_color = isset($settings['consent_banner_text_color']) ? $settings['consent_banner_text_color'] : '#ffffff';
        $accept_color = isset($settings['consent_accept_color']) ? $settings['consent_accept_color'] : '#27ae60';
        $deny_color = isset($settings['consent_deny_color']) ? $settings['consent_deny_color'] : '#95a5a6';
        $preferences_color = isset($settings['consent_preferences_color']) ? $settings['consent_preferences_color'] : '#3498db';

        echo '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-width: 600px;">';

        echo '<div>';
        echo '<label>' . __('Color de fondo:', 'guiders-wp-plugin') . '</label><br>';
        echo '<input type="text" name="guiders_wp_plugin_settings[consent_banner_bg_color]" value="' . esc_attr($bg_color) . '" class="guiders-color-picker" />';
        echo '</div>';

        echo '<div>';
        echo '<label>' . __('Color de texto:', 'guiders-wp-plugin') . '</label><br>';
        echo '<input type="text" name="guiders_wp_plugin_settings[consent_banner_text_color]" value="' . esc_attr($text_color) . '" class="guiders-color-picker" />';
        echo '</div>';

        echo '<div>';
        echo '<label>' . __('Botón Aceptar:', 'guiders-wp-plugin') . '</label><br>';
        echo '<input type="text" name="guiders_wp_plugin_settings[consent_accept_color]" value="' . esc_attr($accept_color) . '" class="guiders-color-picker" />';
        echo '</div>';

        echo '<div>';
        echo '<label>' . __('Botón Rechazar:', 'guiders-wp-plugin') . '</label><br>';
        echo '<input type="text" name="guiders_wp_plugin_settings[consent_deny_color]" value="' . esc_attr($deny_color) . '" class="guiders-color-picker" />';
        echo '</div>';

        echo '<div>';
        echo '<label>' . __('Botón Preferencias:', 'guiders-wp-plugin') . '</label><br>';
        echo '<input type="text" name="guiders_wp_plugin_settings[consent_preferences_color]" value="' . esc_attr($preferences_color) . '" class="guiders-color-picker" />';
        echo '</div>';

        echo '</div>';

        echo '<script>
        jQuery(document).ready(function($) {
            if (typeof $.fn.wpColorPicker !== "undefined") {
                $(".guiders-color-picker").wpColorPicker();
            }
        });
        </script>';

        echo '<p class="description">' . __('Personaliza los colores del banner para que coincidan con tu marca.', 'guiders-wp-plugin') . '</p>';
    }

    /**
     * Enqueue admin assets
     */
    public function enqueueAdminAssets($hook) {
        // Only load on plugin settings page
        if ($hook !== 'settings_page_guiders-settings') {
            return;
        }

        // Add WordPress color picker
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');

        // Add admin styles if needed
        wp_enqueue_style('guiders-admin-style', GUIDERS_WP_PLUGIN_PLUGIN_URL . 'assets/css/admin-style.css', array('wp-color-picker'), GUIDERS_WP_PLUGIN_VERSION);

        // Add inline JavaScript for real-time validation
        $inline_js = "
        jQuery(document).ready(function($) {
            var consentBannerCheckbox = $('#consent_banner_enabled');
            var requireConsentCheckbox = $('#require_consent');

            function checkDependency() {
                var bannerEnabled = consentBannerCheckbox.is(':checked');
                var requireEnabled = requireConsentCheckbox.is(':checked');

                // Remove existing warning
                consentBannerCheckbox.closest('td').find('.guiders-inline-warning').remove();

                // Show warning if banner is enabled but requireConsent is not
                if (bannerEnabled && !requireEnabled) {
                    var warning = $('<div class=\"notice notice-warning inline guiders-inline-warning\" style=\"margin-top:10px; padding: 10px;\">' +
                        '<p style=\"margin:0;\"><strong>⚠️ Advertencia:</strong> Has activado el banner pero \"Requerir Consentimiento GDPR\" está desactivado. ' +
                        'El banner NO se mostrará hasta que actives ambas opciones.</p>' +
                        '</div>');
                    consentBannerCheckbox.closest('td').append(warning);
                }
            }

            // Check on load
            checkDependency();

            // Check on change
            consentBannerCheckbox.on('change', checkDependency);
            requireConsentCheckbox.on('change', checkDependency);
        });
        ";

        wp_add_inline_script('wp-color-picker', $inline_js);
    }

    /**
     * Cookie Management section callback
     */
    public function cookieManagementSectionCallback() {
        echo '<p>' . __('Gestiona cómo Guiders se integra con tu sistema de gestión de cookies.', 'guiders-wp-plugin') . '</p>';
        echo '<p>' . __('El SDK detecta automáticamente plugins de cookies populares como Beautiful Cookie Banner, Moove GDPR y otros compatibles con WP Consent API.', 'guiders-wp-plugin') . '</p>';

        // Agregar enlaces a documentación
        echo '<p style="margin-top: 15px;">';
        echo '<a href="https://github.com/RogerPugaRuiz/guiders-sdk/blob/main/wordpress-plugin/WP_CONSENT_API_INTEGRATION.md" target="_blank" class="button button-secondary">' . __('📚 Guía WP Consent API', 'guiders-wp-plugin') . '</a> ';
        echo '<a href="https://github.com/RogerPugaRuiz/guiders-sdk/blob/main/wordpress-plugin/CUSTOM_COOKIE_INTEGRATION.md" target="_blank" class="button button-secondary">' . __('🛠️ Guía Sistema Personalizado', 'guiders-wp-plugin') . '</a>';
        echo '</p>';
    }

    /**
     * Cookie consent system field callback
     */
    public function cookieConsentSystemFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $cookie_consent_system = isset($settings['cookie_consent_system']) ? $settings['cookie_consent_system'] : 'auto';
        $detected_plugin = $this->detectCookieConsentPlugin();

        ?>
        <fieldset>
            <label>
                <input type="radio" name="guiders_wp_plugin_settings[cookie_consent_system]" value="auto" <?php checked($cookie_consent_system, 'auto'); ?>>
                <strong><?php _e('Automático (recomendado)', 'guiders-wp-plugin'); ?></strong>
            </label>
            <p class="description" style="margin: 5px 0 15px 25px;">
                <?php
                if ($detected_plugin && $detected_plugin['wp_consent_api']) {
                    echo '✅ ' . __('Detectará y usará WP Consent API si está disponible', 'guiders-wp-plugin');
                } else {
                    _e('Usará el sistema interno de Guiders si no hay WP Consent API', 'guiders-wp-plugin');
                }
                ?>
            </p>

            <label>
                <input type="radio" name="guiders_wp_plugin_settings[cookie_consent_system]" value="internal" <?php checked($cookie_consent_system, 'internal'); ?>>
                <strong><?php _e('Sistema interno de Guiders', 'guiders-wp-plugin'); ?></strong>
            </label>
            <p class="description" style="margin: 5px 0 15px 25px;">
                <?php _e('Usará el banner de consentimiento propio de Guiders (configurado arriba en "GDPR & Banner de Consentimiento")', 'guiders-wp-plugin'); ?>
            </p>

            <label>
                <input type="radio" name="guiders_wp_plugin_settings[cookie_consent_system]" value="wp_consent_api" <?php checked($cookie_consent_system, 'wp_consent_api'); ?>>
                <strong><?php _e('WP Consent API (forzado)', 'guiders-wp-plugin'); ?></strong>
            </label>
            <p class="description" style="margin: 5px 0 15px 25px;">
                <?php _e('Forzará el uso de WP Consent API incluso si el plugin interno está habilitado', 'guiders-wp-plugin'); ?>
            </p>

            <label>
                <input type="radio" name="guiders_wp_plugin_settings[cookie_consent_system]" value="custom" <?php checked($cookie_consent_system, 'custom'); ?>>
                <strong><?php _e('Sistema personalizado', 'guiders-wp-plugin'); ?></strong>
            </label>
            <p class="description" style="margin: 5px 0 0 25px;">
                <?php _e('Requiere código personalizado. Ver guía de integración.', 'guiders-wp-plugin'); ?>
                <a href="https://github.com/RogerPugaRuiz/guiders-sdk/blob/main/wordpress-plugin/CUSTOM_COOKIE_INTEGRATION.md" target="_blank"><?php _e('Ver ejemplos', 'guiders-wp-plugin'); ?></a>
            </p>
        </fieldset>
        <?php
    }

    /**
     * WP Consent API sync enabled field callback
     */
    public function wpConsentApiSyncEnabledFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $enabled = isset($settings['wp_consent_api_sync_enabled']) ? $settings['wp_consent_api_sync_enabled'] : true;
        $cookie_consent_system = isset($settings['cookie_consent_system']) ? $settings['cookie_consent_system'] : 'auto';
        $detected_plugin = $this->detectCookieConsentPlugin();

        ?>
        <label>
            <input type="checkbox" name="guiders_wp_plugin_settings[wp_consent_api_sync_enabled]" value="1" <?php checked($enabled, true); ?>>
            <?php _e('Activar sincronización con WP Consent API', 'guiders-wp-plugin'); ?>
        </label>
        <p class="description">
            <?php _e('Sincroniza automáticamente las preferencias de cookies del usuario con Guiders.', 'guiders-wp-plugin'); ?>
            <?php if ($detected_plugin && $detected_plugin['wp_consent_api']): ?>
                <br><strong style="color: #46b450;">✅ <?php _e('Plugin compatible detectado:', 'guiders-wp-plugin'); ?> <?php echo esc_html($detected_plugin['name']); ?></strong>
            <?php elseif ($detected_plugin && !$detected_plugin['wp_consent_api']): ?>
                <br><strong style="color: #dc3232;">⚠️ <?php echo sprintf(__('Tu plugin "%s" no soporta WP Consent API.', 'guiders-wp-plugin'), esc_html($detected_plugin['name'])); ?></strong>
                <a href="https://github.com/RogerPugaRuiz/guiders-sdk/blob/main/wordpress-plugin/CUSTOM_COOKIE_INTEGRATION.md" target="_blank"><?php _e('Ver cómo integrarlo', 'guiders-wp-plugin'); ?></a>
            <?php else: ?>
                <br><?php _e('No se detectó ningún plugin de cookies. Instala uno compatible o usa el sistema interno.', 'guiders-wp-plugin'); ?>
            <?php endif; ?>
        </p>
        <?php

        // Mostrar mapeo de categorías
        if ($enabled && $detected_plugin && $detected_plugin['wp_consent_api']): ?>
            <div style="margin-top: 10px; padding: 10px; background: #f0f0f1; border-left: 4px solid #72aee6;">
                <strong><?php _e('Mapeo de categorías:', 'guiders-wp-plugin'); ?></strong>
                <ul style="margin: 5px 0 0 20px;">
                    <li><code>functional</code> (WP) → <code>functional</code> (Guiders)</li>
                    <li><code>statistics</code> (WP) → <code>analytics</code> (Guiders)</li>
                    <li><code>marketing</code> (WP) → <code>personalization</code> (Guiders)</li>
                </ul>
            </div>
        <?php endif;
    }

    /**
     * Cookie consent debug field callback
     */
    public function cookieConsentDebugFieldCallback() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        $debug = isset($settings['cookie_consent_debug']) ? $settings['cookie_consent_debug'] : false;

        ?>
        <label>
            <input type="checkbox" name="guiders_wp_plugin_settings[cookie_consent_debug]" value="1" <?php checked($debug, true); ?>>
            <?php _e('Mostrar logs de sincronización en consola del navegador', 'guiders-wp-plugin'); ?>
        </label>
        <p class="description">
            <?php _e('Útil para debugging. Los mensajes aparecerán con el prefijo "[Guiders WP]" en la consola del navegador (F12).', 'guiders-wp-plugin'); ?>
        </p>
        <p class="description">
            <strong><?php _e('Ejemplo de logs:', 'guiders-wp-plugin'); ?></strong><br>
            <code style="background: #f0f0f1; padding: 2px 6px; display: inline-block; margin-top: 5px;">[Guiders WP] WP Consent API detectada - sincronizando consentimiento</code><br>
            <code style="background: #f0f0f1; padding: 2px 6px; display: inline-block; margin-top: 2px;">[Guiders WP] Consentimiento sincronizado: functional → functional = true</code>
        </p>
        <?php
    }

    /**
     * Detect installed cookie consent plugins
     * @return array|null Plugin information or null if none detected
     */
    private function detectCookieConsentPlugin() {
        $detected = null;

        // Lista de plugins compatibles con WP Consent API
        $wp_consent_plugins = array(
            'cookiefirst-cookie-consent/cookiefirst.php' => 'CookieFirst',
            'cookie-law-info/cookie-law-info.php' => 'CookieYes',
            'complianz-gdpr/complianz-gpdr.php' => 'Complianz GDPR',
            'cookiebot/cookiebot.php' => 'Cookiebot',
            'gdpr-cookie-consent/gdpr-cookie-consent.php' => 'WP Cookie Consent'
        );

        // Plugins que NO soportan WP Consent API (pero son populares)
        // Estos plugins requieren integración manual personalizada
        $other_plugins = array(
            'gdpr-cookie-compliance/moove-gdpr.php' => 'GDPR Cookie Compliance (Moove)',
            'beautiful-cookie-banner/beautiful-cookie-banner.php' => 'Beautiful Cookie Banner',
            'beautiful-and-responsive-cookie-consent/beautiful-and-responsive-cookie-consent.php' => 'Beautiful Cookie Consent',
            'beautiful-and-responsive-cookie-consent/index.php' => 'Beautiful Cookie Consent',
            'beautiful-and-responsive-cookie-consent/main.php' => 'Beautiful Cookie Consent',
            'beautiful-and-responsive-cookie-consent/includes/main.php' => 'Beautiful Cookie Consent',
            'cookie-notice/cookie-notice.php' => 'Cookie Notice',
            'gdpr/gdpr.php' => 'GDPR',
            'termly-cookie-consent/termly-cookie-consent.php' => 'Termly'
        );

        // Verificar plugins con WP Consent API
        foreach ($wp_consent_plugins as $plugin_file => $plugin_name) {
            if (is_plugin_active($plugin_file)) {
                $detected = array(
                    'name' => $plugin_name,
                    'file' => $plugin_file,
                    'wp_consent_api' => true,
                    'detection_method' => 'plugin_active'
                );
                break;
            }
        }

        // Si no se encontró, verificar otros plugins populares
        if (!$detected) {
            foreach ($other_plugins as $plugin_file => $plugin_name) {
                if (is_plugin_active($plugin_file)) {
                    $detected = array(
                        'name' => $plugin_name,
                        'file' => $plugin_file,
                        'wp_consent_api' => false,
                        'detection_method' => 'plugin_active'
                    );
                    break;
                }
            }
        }

        // MÉTODO ALTERNATIVO: Detectar mediante constantes y funciones
        // Algunos plugins se instalan con nombres de carpeta diferentes
        if (!$detected) {
            // Beautiful Cookie Banner detection via constants/functions
            if (defined('BEAUTIFUL_COOKIE_BANNER_VERSION') || function_exists('beautiful_cookie_banner_init')) {
                $detected = array(
                    'name' => 'Beautiful Cookie Banner',
                    'file' => 'detected_via_constant',
                    'wp_consent_api' => false,
                    'detection_method' => 'constant'
                );
            }
            // Moove GDPR detection via constants
            elseif (defined('MOOVE_GDPR_VERSION') || class_exists('Moove_GDPR_Controller')) {
                $detected = array(
                    'name' => 'GDPR Cookie Compliance (Moove)',
                    'file' => 'detected_via_constant',
                    'wp_consent_api' => false,
                    'detection_method' => 'constant'
                );
            }
            // Cookie Notice detection
            elseif (defined('COOKIE_NOTICE_VERSION') || class_exists('Cookie_Notice')) {
                $detected = array(
                    'name' => 'Cookie Notice',
                    'file' => 'detected_via_constant',
                    'wp_consent_api' => false,
                    'detection_method' => 'constant'
                );
            }
        }

        return $detected;
    }

    /**
     * Show admin notices
     */
    public function showAdminNotices() {
        $settings = get_option('guiders_wp_plugin_settings', array());
        
        // Show notice if API key is not set but plugin is enabled
        if (!empty($settings['enabled']) && empty($settings['api_key'])) {
            echo '<div class="notice notice-warning is-dismissible">';
            echo '<p>' . sprintf(
                __('Guiders SDK está habilitado pero no se ha configurado la API Key. <a href="%s">Configúrala aquí</a>.', 'guiders-wp-plugin'),
                admin_url('admin.php?page=guiders-settings')
            ) . '</p>';
            echo '</div>';
        }
        
        // Show success notice after settings save
        if (isset($_GET['settings-updated']) && $_GET['settings-updated'] === 'true' && isset($_GET['page']) && $_GET['page'] === 'guiders-settings') {
            echo '<div class="notice notice-success is-dismissible">';
            echo '<p>' . __('Configuración de Guiders SDK guardada correctamente.', 'guiders-wp-plugin') . '</p>';
            echo '</div>';
        }
    }
}