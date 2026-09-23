<?php
/**
 * Admin settings page template with tab-based interface
 *
 * @since 2.5.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current tab from URL parameter, default to 'general'
$active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'general';
if ($active_tab === 'cookies' || $active_tab === 'chat') {
    $active_tab = 'general';
}
?>

<div class="wrap guiders-admin-wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

    <div class="guiders-admin-header">
        <h2><?php _e('Configuración del SDK de Guiders', 'guiders-wp-plugin'); ?></h2>
        <p><?php _e('Configura el SDK de Guiders para habilitar tracking inteligente, chat en vivo y notificaciones en tu sitio WordPress.', 'guiders-wp-plugin'); ?></p>
    </div>

    <!-- Tab Navigation -->
    <nav class="nav-tab-wrapper guiders-nav-tab-wrapper">
        <a href="?page=guiders-settings&tab=general"
           class="nav-tab <?php echo $active_tab === 'general' ? 'nav-tab-active' : ''; ?>">
            <span class="dashicons dashicons-admin-settings"></span>
            <?php _e('General', 'guiders-wp-plugin'); ?>
        </a>
        <a href="?page=guiders-settings&tab=tracking"
           class="nav-tab <?php echo $active_tab === 'tracking' ? 'nav-tab-active' : ''; ?>">
            <span class="dashicons dashicons-chart-line"></span>
            <?php _e('Tracking', 'guiders-wp-plugin'); ?>
        </a>
    </nav>

    <div class="guiders-admin-content">
        <div class="guiders-main-settings">
            <form method="post" action="options.php">
                <?php
                settings_fields('guiders_wp_plugin_settings_group');

                // Show sections based on active tab
                switch ($active_tab) {
                    case 'general':
                        do_settings_sections('guiders-settings-general');
                        break;
                    case 'tracking':
                        do_settings_sections('guiders-settings-tracking');
                        break;
                    default:
                        do_settings_sections('guiders-settings-general');
                }

                submit_button(__('Guardar Configuración', 'guiders-wp-plugin'));
                ?>
            </form>
        </div>

        <!-- Dynamic Sidebar based on active tab -->
        <div class="guiders-sidebar">
            <?php if ($active_tab === 'general'): ?>
                <!-- General Tab Sidebar -->
                <div class="guiders-info-box">
                    <h3><?php _e('Configuración Básica', 'guiders-wp-plugin'); ?></h3>
                    <p><?php _e('Comienza configurando tu API Key de Guiders para habilitar todas las funcionalidades del SDK.', 'guiders-wp-plugin'); ?></p>
                    <ul>
                        <li><?php _e('⭐ <strong>API Key:</strong> Requerida para todas las funciones', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('🔧 <strong>Entorno:</strong> Usa "production" para sitios en vivo', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('⚡ <strong>Auto-Init:</strong> Controla cuándo se carga el SDK', 'guiders-wp-plugin'); ?></li>
                    </ul>
                </div>

                <div class="guiders-info-box">
                    <h3><?php _e('Modos de Auto-Inicialización', 'guiders-wp-plugin'); ?></h3>
                    <ul>
                        <li><?php _e('<strong>immediate:</strong> Carga instantánea (más rápido)', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('<strong>domready:</strong> Espera al DOM (recomendado)', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('<strong>delayed:</strong> Retraso personalizado (ms)', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('<strong>manual:</strong> Control total via JavaScript', 'guiders-wp-plugin'); ?></li>
                    </ul>
                </div>

            <?php elseif ($active_tab === 'tracking'): ?>
                <!-- Tracking Tab Sidebar -->
                <div class="guiders-info-box">
                    <h3><?php _e('Tracking de Eventos', 'guiders-wp-plugin'); ?></h3>
                    <p><?php _e('El SDK de Guiders proporciona tracking avanzado de eventos con:', 'guiders-wp-plugin'); ?></p>
                    <ul>
                        <li><?php _e('🎯 Detección heurística inteligente de elementos', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('📊 Tracking automático de eventos', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('⚡ Sistema de cola con persistencia (V2)', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('🔄 Procesamiento por lotes eficiente', 'guiders-wp-plugin'); ?></li>
                    </ul>
                </div>

                <div class="guiders-info-box">
                    <h3><?php _e('Detección Heurística', 'guiders-wp-plugin'); ?></h3>
                    <p><?php _e('Detecta automáticamente elementos como:', 'guiders-wp-plugin'); ?></p>
                    <ul>
                        <li><?php _e('Botones "Añadir al carrito"', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('Enlaces "Contactar"', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('Formularios de búsqueda', 'guiders-wp-plugin'); ?></li>
                        <li><?php _e('Botones de compra y checkout', 'guiders-wp-plugin'); ?></li>
                    </ul>
                    <p><strong><?php _e('¡Sin necesidad de modificar el HTML!', 'guiders-wp-plugin'); ?></strong></p>
                </div>
            <?php endif; ?>

            <!-- Common Sidebar Sections (shown on all tabs) -->
            <div class="guiders-info-box">
                <h3><?php _e('Información del Plugin', 'guiders-wp-plugin'); ?></h3>
                <p><strong><?php _e('Versión actual:', 'guiders-wp-plugin'); ?></strong> v<?php echo GUIDERS_WP_PLUGIN_VERSION; ?></p>

                <?php
                // Check if there's an update available
                $update_plugins = get_site_transient('update_plugins');
                $plugin_basename = plugin_basename(GUIDERS_WP_PLUGIN_PLUGIN_FILE);
                $has_update = isset($update_plugins->response[$plugin_basename]);

                if ($has_update) {
                    $update_info = $update_plugins->response[$plugin_basename];
                    echo '<div class="notice notice-warning inline" style="margin: 10px 0; padding: 8px 12px;">';
                    printf(
                        __('🔄 <strong>Nueva versión disponible:</strong> v%s', 'guiders-wp-plugin'),
                        esc_html($update_info->new_version)
                    );
                    echo '<br><a href="' . admin_url('plugins.php') . '">' . __('Ir a actualizaciones', 'guiders-wp-plugin') . '</a>';
                    echo '</div>';
                } else {
                    echo '<p style="color: #46b450;">✅ ' . __('Plugin actualizado', 'guiders-wp-plugin') . '</p>';
                }
                ?>

                <p>
                    <a href="<?php echo admin_url('plugins.php?force-check=1'); ?>" class="button button-secondary">
                        <?php _e('🔍 Verificar actualizaciones', 'guiders-wp-plugin'); ?>
                    </a>
                </p>
            </div>

            <div class="guiders-info-box">
                <h3><?php _e('Soporte y Documentación', 'guiders-wp-plugin'); ?></h3>
                <ul>
                    <li><a href="https://github.com/RogerPugaRuiz/guiders-sdk" target="_blank"><?php _e('📚 Documentación completa', 'guiders-wp-plugin'); ?></a></li>
                    <li><a href="https://guiders.ancoradual.com" target="_blank"><?php _e('🌐 Sitio web oficial', 'guiders-wp-plugin'); ?></a></li>
                    <li><a href="https://github.com/RogerPugaRuiz/guiders-sdk/issues" target="_blank"><?php _e('🐛 Reportar problemas', 'guiders-wp-plugin'); ?></a></li>
                    <li><a href="https://github.com/RogerPugaRuiz/guiders-sdk/releases" target="_blank"><?php _e('📋 Ver versiones', 'guiders-wp-plugin'); ?></a></li>
                </ul>
            </div>
        </div>
    </div>
</div>

<style>
/* Tab Navigation Styles */
.guiders-nav-tab-wrapper {
    margin: 20px 0;
    border-bottom: 1px solid #ccd0d4;
}

.guiders-nav-tab-wrapper .nav-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.guiders-nav-tab-wrapper .nav-tab .dashicons {
    font-size: 18px;
    width: 18px;
    height: 18px;
}

.guiders-nav-tab-wrapper .nav-tab:hover {
    background-color: #f0f0f1;
}

.guiders-nav-tab-wrapper .nav-tab-active {
    background-color: #fff;
    border-bottom: 2px solid #2271b1;
    color: #2271b1;
}

/* Content Layout */
.guiders-admin-content {
    display: flex;
    gap: 20px;
    margin-top: 20px;
}

.guiders-main-settings {
    flex: 2;
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}

.guiders-sidebar {
    flex: 1;
    max-width: 350px;
}

/* Info Box Styles */
.guiders-info-box {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
    transition: box-shadow 0.2s ease;
}

.guiders-info-box:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,.08);
}

.guiders-info-box h3 {
    margin-top: 0;
    color: #1d2327;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 10px;
    font-size: 15px;
    font-weight: 600;
}

.guiders-info-box h4 {
    color: #2c3338;
    margin-bottom: 8px;
    font-size: 14px;
}

.guiders-info-box ul {
    margin: 10px 0;
    padding-left: 20px;
}

.guiders-info-box li {
    margin-bottom: 8px;
    line-height: 1.5;
    font-size: 13px;
}

.guiders-info-box a {
    text-decoration: none;
    color: #2271b1;
    transition: color 0.2s ease;
}

.guiders-info-box a:hover {
    color: #135e96;
    text-decoration: underline;
}

.guiders-info-box .description {
    font-size: 13px;
    color: #646970;
    font-style: italic;
    margin-top: 8px;
}

/* Header Styles */
.guiders-admin-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    padding: 25px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.guiders-admin-header h2 {
    margin-top: 0;
    color: #fff;
    font-size: 22px;
    font-weight: 600;
}

.guiders-admin-header p {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin-bottom: 0;
}

/* Form Field Styles */
.form-table th {
    width: 220px;
    font-weight: 600;
    color: #1d2327;
}

.form-table td input[type="text"],
.form-table td input[type="number"],
.form-table td select,
.form-table td textarea {
    min-width: 400px;
    border-color: #8c8f94;
    border-radius: 4px;
    transition: border-color 0.2s ease;
}

.form-table td input[type="text"]:focus,
.form-table td input[type="number"]:focus,
.form-table td select:focus,
.form-table td textarea:focus {
    border-color: #2271b1;
    box-shadow: 0 0 0 1px #2271b1;
}

.form-table td .description {
    font-style: italic;
    color: #646970;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.5;
}

.form-table td .description code {
    background: #f0f0f1;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
}

/* Status Indicators */
.guiders-status-enabled {
    color: #00a32a;
    font-weight: 600;
}

.guiders-status-disabled {
    color: #d63638;
    font-weight: 600;
}

/* Required Field Indicator */
.guiders-required::after {
    content: ' *';
    color: #d63638;
    font-weight: 600;
}

/* Collapsible Section Styles */
.guiders-collapsible-section {
    margin-top: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.guiders-collapsible-header {
    background: #f6f7f7;
    padding: 12px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.2s ease;
}

.guiders-collapsible-header:hover {
    background: #e8eaeb;
}

.guiders-collapsible-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #2c3338;
}

.guiders-collapsible-header .dashicons {
    transition: transform 0.3s ease;
}

.guiders-collapsible-header.active .dashicons {
    transform: rotate(180deg);
}

.guiders-collapsible-content {
    display: none;
    padding: 15px;
    background: #fff;
}

.guiders-collapsible-content.active {
    display: block;
}

/* Responsive Design */
@media (max-width: 980px) {
    .guiders-admin-content {
        flex-direction: column;
    }

    .guiders-sidebar {
        max-width: none;
    }

    .form-table td input[type="text"],
    .form-table td input[type="number"],
    .form-table td select,
    .form-table td textarea {
        min-width: 100%;
    }
}

/* Button Styles */
#submit {
    background: #2271b1;
    border-color: #2271b1;
    padding: 8px 20px;
    height: auto;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
}

#submit:hover,
#submit:focus {
    background: #135e96;
    border-color: #135e96;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(34, 113, 177, 0.3);
}

/* Notices */
.notice.inline {
    margin: 10px 0 !important;
}
</style>

<script>
jQuery(document).ready(function($) {
    // Preserve all settings when submitting from a specific tab
    // This prevents losing settings from other tabs
    var existingSettings = <?php echo json_encode(get_option('guiders_wp_plugin_settings', array())); ?>;

    // Preserve temporary changes when switching tabs (without saving)
    var TEMP_STORAGE_KEY = 'guiders_temp_settings';

    // Restore temporary changes from sessionStorage when page loads
    function restoreTempChanges() {
        try {
            var tempData = sessionStorage.getItem(TEMP_STORAGE_KEY);
            if (tempData) {
                var tempSettings = JSON.parse(tempData);

                $.each(tempSettings, function(fieldName, value) {
                    var $field = $('[name="guiders_wp_plugin_settings[' + fieldName + ']"]');

                    if ($field.length) {
                        if ($field.attr('type') === 'checkbox') {
                            $field.prop('checked', value === true || value === '1' || value === 'true');
                        } else if ($field.attr('type') === 'radio') {
                            $field.filter('[value="' + value + '"]').prop('checked', true);
                        } else {
                            $field.val(value);
                        }
                    }
                });
            }
        } catch (e) {
        }
    }

    // Save field changes to sessionStorage as user types/clicks
    function saveTempChange(fieldName, value) {
        try {
            var tempData = sessionStorage.getItem(TEMP_STORAGE_KEY);
            var tempSettings = tempData ? JSON.parse(tempData) : {};

            tempSettings[fieldName] = value;
            sessionStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(tempSettings));
        } catch (e) {
        }
    }

    // Listen to all form field changes
    $('form').on('change', 'input, select, textarea', function() {
        var $field = $(this);
        var fieldName = $field.attr('name');

        if (fieldName && fieldName.indexOf('guiders_wp_plugin_settings[') === 0) {
            // Extract field name without the wrapper
            var cleanName = fieldName.replace('guiders_wp_plugin_settings[', '').replace(']', '');
            var value;

            if ($field.attr('type') === 'checkbox') {
                value = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
                value = $field.filter(':checked').val();
            } else {
                value = $field.val();
            }

            saveTempChange(cleanName, value);
        }
    });

    // Restore temp changes on page load
    restoreTempChanges();

    // Clear temp storage on successful form submit
    $('form').on('submit', function() {
        var form = $(this);
        var formData = form.serializeArray();
        var submittedFields = {};

        // Get all fields being submitted
        $.each(formData, function(i, field) {
            var name = field.name.replace('guiders_wp_plugin_settings[', '').replace(']', '');
            submittedFields[name] = true;
        });

        // Get all field names from the current visible form (including unchecked checkboxes)
        var currentTabFields = {};
        form.find('input, select, textarea').each(function() {
            var $field = $(this);
            var fieldName = $field.attr('name');
            if (fieldName && fieldName.indexOf('guiders_wp_plugin_settings[') === 0) {
                var cleanName = fieldName.replace('guiders_wp_plugin_settings[', '').replace(']', '');
                currentTabFields[cleanName] = true;
            }
        });

        // Get temporary changes from sessionStorage (if any)
        var tempSettings = {};
        try {
            var tempData = sessionStorage.getItem(TEMP_STORAGE_KEY);
            if (tempData) {
                tempSettings = JSON.parse(tempData);
            }
        } catch (e) {
        }

        // Add hidden fields ONLY for settings that aren't in the current tab
        // Priority: tempSettings > existingSettings (temp changes override DB values)
        $.each(existingSettings, function(key, value) {
            // Skip if: already submitted, in current tab, or is active_tab field
            if (!submittedFields[key] && !currentTabFields[key] && key !== 'active_tab') {
                // Use temp value if exists, otherwise use DB value
                var finalValue = tempSettings.hasOwnProperty(key) ? tempSettings[key] : value;

                // Convert boolean to string for proper PHP handling
                // PHP receives strings from POST, so false → '0', true → '1'
                if (typeof finalValue === 'boolean') {
                    finalValue = finalValue ? '1' : '0';
                }

                // Add hidden field to preserve this setting from other tabs
                var fieldName = 'guiders_wp_plugin_settings[' + key + ']';
                var hiddenInput = $('<input>').attr({
                    type: 'hidden',
                    name: fieldName,
                    value: finalValue
                });
                form.append(hiddenInput);
            }
        });

        // For checkboxes in current tab that are unchecked, explicitly set to empty/false
        // This ensures unchecked checkboxes are properly saved as false
        $.each(currentTabFields, function(fieldName) {
            if (!submittedFields[fieldName]) {
                var $field = form.find('[name="guiders_wp_plugin_settings[' + fieldName + ']"]');
                if ($field.attr('type') === 'checkbox') {
                    // Add hidden field with value 0 for unchecked checkbox
                    var hiddenInput = $('<input>').attr({
                        type: 'hidden',
                        name: 'guiders_wp_plugin_settings[' + fieldName + ']',
                        value: '0'
                    });
                    form.append(hiddenInput);
                }
            }
        });

        // Clear temp storage after submit (settings will be saved to DB)
        sessionStorage.removeItem(TEMP_STORAGE_KEY);
    });

    // Show/hide confidence threshold based on heuristic detection
    function toggleConfidenceThreshold() {
        var isEnabled = $('#heuristic_detection').is(':checked');
        var row = $('#confidence_threshold').closest('tr');

        if (isEnabled) {
            row.show();
        } else {
            row.hide();
        }
    }

    // Initial check
    toggleConfidenceThreshold();

    // Listen for changes
    $('#heuristic_detection').change(toggleConfidenceThreshold);

    // Validate API key format
    $('#api_key').on('blur', function() {
        var apiKey = $(this).val().trim();
        var feedback = $(this).next('.api-key-feedback');

        if (feedback.length === 0) {
            $(this).after('<div class="api-key-feedback"></div>');
            feedback = $(this).next('.api-key-feedback');
        }

        if (apiKey === '') {
            feedback.html('<span style="color: #d63638;">⚠️ API Key es requerida</span>');
        } else if (apiKey.length < 10) {
            feedback.html('<span style="color: #d63638;">⚠️ API Key parece demasiado corta</span>');
        } else {
            feedback.html('<span style="color: #00a32a;">✅ API Key válida</span>');
        }
    });

    // Show/hide auto-init delay based on auto-init mode
    function toggleAutoInitDelay() {
        var mode = $('#auto_init_mode').val();
        var row = $('#auto_init_delay').closest('tr');

        if (mode === 'delayed') {
            row.show();
        } else {
            row.hide();
        }
    }

    // Initial check for auto-init
    toggleAutoInitDelay();

    // Listen for changes
    $('#auto_init_mode').change(toggleAutoInitDelay);

    // Collapsible sections functionality
    $('.guiders-collapsible-header').on('click', function() {
        $(this).toggleClass('active');
        $(this).next('.guiders-collapsible-content').toggleClass('active').slideToggle(300);
    });

    // Save collapsed state in localStorage
    $('.guiders-collapsible-header').each(function(index) {
        var sectionId = 'guiders-section-' + index;
        var isCollapsed = localStorage.getItem(sectionId) === 'collapsed';

        if (isCollapsed) {
            $(this).removeClass('active');
            $(this).next('.guiders-collapsible-content').removeClass('active').hide();
        }

        $(this).on('click', function() {
            var isNowCollapsed = !$(this).hasClass('active');
            localStorage.setItem(sectionId, isNowCollapsed ? 'collapsed' : 'expanded');
        });
    });

    // Smooth scroll to validation errors
    if ($('.notice-error').length) {
        $('html, body').animate({
            scrollTop: $('.notice-error').offset().top - 50
        }, 500);
    }
});
</script>
