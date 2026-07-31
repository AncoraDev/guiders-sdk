# Guía Rápida GDPR - Guiders SDK para WordPress

## 🚀 Inicio Rápido

El plugin Guiders SDK incluye un **sistema completo de control de consentimiento** para cumplir con GDPR/LOPDGDD/LSSI.

### ¿Qué hace automáticamente el plugin?

✅ Espera el consentimiento del usuario antes de iniciar tracking
✅ Proporciona APIs JavaScript para controlar el consentimiento
✅ Permite implementar derechos GDPR (acceso y eliminación de datos)
✅ Persiste el estado de consentimiento en localStorage

### ¿Qué debes hacer TÚ?

❗ **Implementar un banner de consentimiento** en tu sitio web
❗ **Obtener consentimiento explícito** del usuario antes del tracking
❗ **Documentar** en tu Política de Privacidad qué datos recopilas

---

## 📋 Implementación Básica

### Opción 1: Banner Personalizado (Más Simple)

Añade este código a `functions.php` de tu tema:

```php
/**
 * Banner de consentimiento básico para Guiders
 */
function guiders_simple_consent_banner() {
    if (is_admin()) return;
    ?>
    <div id="guiders-banner" style="display:none; position:fixed; bottom:0; width:100%; background:#2c3e50; color:white; padding:20px; z-index:999999; text-align:center;">
        <p style="margin:0 0 15px 0;">🍪 Usamos cookies para mejorar tu experiencia y proporcionar chat en vivo.</p>
        <button onclick="window.guiders.grantConsent(); document.getElementById('guiders-banner').style.display='none'" style="background:#27ae60; color:white; border:none; padding:10px 20px; margin:5px; cursor:pointer; border-radius:4px;">
            ✅ Aceptar
        </button>
        <button onclick="window.guiders.denyConsent(); document.getElementById('guiders-banner').style.display='none'" style="background:#95a5a6; color:white; border:none; padding:10px 20px; margin:5px; cursor:pointer; border-radius:4px;">
            ❌ Rechazar
        </button>
    </div>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        if (window.guiders && window.guiders.getConsentStatus() === 'pending') {
            document.getElementById('guiders-banner').style.display = 'block';
        }
    });
    </script>
    <?php
}
add_action('wp_footer', 'guiders_simple_consent_banner', 100);
```

### Opción 2: Usar Plugin de Cookies (Recomendado)

Si usas **Complianz**, **CookieYes**, o **Cookiebot**, consulta la guía completa para integración automática.

---

## 🔌 Integración con Complianz (Recomendado)

**Complianz** es el plugin de cookies más popular para WordPress y tiene integración sencilla:

```php
function guiders_complianz_integration() {
    if (is_admin()) return;
    ?>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.guiders) return;

        // Escuchar cambios de consentimiento
        document.addEventListener('cmplz_status_change', function(e) {
            const consent = e.detail;

            window.guiders.grantConsentWithPreferences({
                analytics: consent.statistics === 'allow',
                functional: consent.functional === 'allow',
                personalization: consent.marketing === 'allow'
            });
        });

        // Verificar estado inicial
        if (typeof cmplz_categories !== 'undefined' && cmplz_categories.functional === 'allow') {
            window.guiders.grantConsentWithPreferences({
                analytics: cmplz_categories.statistics === 'allow',
                functional: cmplz_categories.functional === 'allow',
                personalization: cmplz_categories.marketing === 'allow'
            });
        }
    });
    </script>
    <?php
}
add_action('wp_footer', 'guiders_complianz_integration', 100);
```

---

## 📖 APIs Disponibles

Una vez que el plugin está activo, tienes acceso a estas APIs en JavaScript:

```javascript
// Otorgar consentimiento completo
window.guiders.grantConsent();

// Otorgar con preferencias específicas
window.guiders.grantConsentWithPreferences({
  analytics: true,      // Tracking de eventos
  functional: true,     // Chat en vivo
  personalization: false // Personalización
});

// Denegar consentimiento
window.guiders.denyConsent();

// Revocar consentimiento
window.guiders.revokeConsent();

// Consultar estado
window.guiders.getConsentStatus(); // 'pending' | 'granted' | 'denied'
window.guiders.isConsentGranted(); // true/false

// Derechos GDPR
await window.guiders.deleteVisitorData();  // Eliminar datos
await window.guiders.exportVisitorData();  // Descargar datos
```

---

## 🎯 Categorías de Datos

### Analytics (Analíticas)
- Eventos de tracking personalizados
- Eventos de sesión (inicio, fin, duración)
- Clicks en botones y formularios
- Métricas de uso del chat

### Functional (Funcionales)
- Fingerprint del navegador (identificación)
- Session ID
- Chat ID y mensajes
- Estado de conexión

### Personalization (Personalización)
- Preferencias del usuario
- Historial de chats
- Configuración de mensajes de bienvenida

---

## ⚖️ Derechos del Usuario (GDPR)

Añade estos botones a tu página de privacidad usando shortcodes:

```
[guiders_delete_data text="🗑️ Eliminar mis datos"]
[guiders_export_data text="📥 Descargar mis datos"]
```

Para usar los shortcodes, añade este código a `functions.php`:

```php
// Ver la guía completa WORDPRESS_GDPR_GUIDE.md para el código completo
```

---

## 📚 Documentación Completa

Para implementación detallada, ejemplos avanzados e integraciones específicas:

👉 **[WORDPRESS_GDPR_GUIDE.md](../WORDPRESS_GDPR_GUIDE.md)** - Guía completa para WordPress

Incluye:
- ✅ Integración con todos los plugins de cookies populares
- ✅ Banner personalizado con modal de preferencias
- ✅ Shortcodes para derechos GDPR
- ✅ Ejemplos de código listos para copiar/pegar
- ✅ Checklist de cumplimiento legal

---

## ❓ FAQ Rápido

### ¿El plugin crea el banner automáticamente?

**No.** Eres responsable de implementar el banner de consentimiento. El plugin solo proporciona las APIs para controlarlo.

### ¿Puedo usar un plugin de cookies de terceros?

**Sí.** Recomendamos usar Complianz, CookieYes o Cookiebot. La guía completa tiene ejemplos de integración.

### ¿Qué pasa si no implemento el banner?

El SDK esperará el consentimiento indefinidamente y **NO iniciará el tracking**. El chat tampoco se mostrará hasta que se otorgue consentimiento funcional.

### ¿Es legal usar el plugin sin banner?

**Solo si**:
- Tu sitio no está dirigido a usuarios de la UE/EEA
- Solo usas cookies estrictamente necesarias
- No haces tracking de usuarios

Para sitios en España o la UE, **es obligatorio** implementar un sistema de consentimiento.

### ¿El plugin cumple con GDPR?

El plugin proporciona las **herramientas técnicas** para cumplir con GDPR (control de tracking, eliminación de datos, etc.). La **responsabilidad legal** de obtener el consentimiento y documentarlo es tuya como propietario del sitio web.

---

## 🆘 Soporte

- 📖 Guía completa WordPress: `WORDPRESS_GDPR_GUIDE.md`
- 📖 Guía general GDPR: `../../docs/consent/GDPR_CONSENT.md`
- 🐛 Issues: [GitHub](https://github.com/RogerPugaRuiz/guiders-sdk/issues)
- 💬 Email: support@guiders.com

---

## ✅ Checklist Rápido

Antes de lanzar tu sitio:

- [ ] Banner de consentimiento implementado
- [ ] Tracking pausado hasta obtener consentimiento
- [ ] Política de privacidad actualizada
- [ ] Probado que el tracking se pausa sin consentimiento
- [ ] Botones de eliminar/descargar datos añadidos (opcional pero recomendado)

---

**Recuerda**: El propietario del sitio web (TÚ) es responsable de:
- ✅ Mostrar el banner de consentimiento
- ✅ Obtener consentimiento explícito
- ✅ Documentar en política de privacidad

Guiders SDK proporciona:
- ✅ APIs para control de tracking
- ✅ Métodos para derechos GDPR
- ✅ Persistencia de consentimiento
