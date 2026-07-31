# Guía de Uso: Sistema GDPR en Demo PHP

## 🚀 Inicio Rápido

El sistema GDPR ya está integrado en la demo. Solo necesitas:

1. **Acceder a la demo GDPR:**
   ```
   http://localhost:8080/gdpr-demo
   ```

2. **El banner aparecerá automáticamente** si no hay consentimiento previo.

## 📁 Archivos Incluidos

### 1. Banner de Consentimiento
**Ubicación:** `demo/app/partials/gdpr-banner.php`

Este archivo incluye:
- ✅ Banner fijo en la parte inferior
- ✅ Modal de preferencias granulares
- ✅ Estilos CSS completos
- ✅ JavaScript para gestión de consentimiento
- ✅ Integración automática con Guiders SDK

### 2. Página de Demostración
**Ubicación:** `demo/app/pages/gdpr-demo.php`

Características:
- 📊 Visualización de estado de consentimiento en tiempo real
- ✅ Botones para probar todas las funcionalidades
- 📦 Exportación de datos (GDPR Right to Access)
- 🗑️ Eliminación de datos (GDPR Right to Erasure)
- 🎯 Preferencias granulares por categoría

### 3. Integración en Header
**Ubicación:** `demo/app/partials/header.php`

El banner se incluye automáticamente en todas las páginas mediante:
```php
<?php
require_once __DIR__ . '/gdpr-banner.php';
?>
```

## 🎯 Funcionalidades Disponibles

### Banner de Consentimiento

El banner aparece automáticamente cuando:
- El usuario visita el sitio por primera vez
- No hay consentimiento previo guardado
- El estado es `pending`

**Opciones del banner:**
- **✅ Aceptar todas:** Otorga consentimiento completo (analytics, functional, personalization)
- **❌ Rechazar:** Solo permite cookies funcionales (necesarias)
- **⚙️ Preferencias:** Abre modal para configuración granular

### Modal de Preferencias

**Categorías disponibles:**

1. **Cookies Funcionales** (OBLIGATORIAS)
   - Chat en vivo
   - Identificación del visitante
   - Funciones básicas del sitio
   - **No se pueden desactivar**

2. **Cookies de Análisis** (Opcionales)
   - Tracking de eventos
   - Páginas visitadas
   - Clics y tiempo de permanencia
   - Métricas de uso

3. **Cookies de Personalización** (Opcionales)
   - Preferencias del usuario
   - Mensajes de bienvenida personalizados
   - Configuración del chat
   - Idioma y ajustes

## 💻 Uso Programático

### APIs Disponibles en JavaScript

```javascript
// Verificar estado de consentimiento
const status = window.guiders.getConsentStatus();
// Retorna: 'pending' | 'granted' | 'denied'

// Obtener estado completo
const state = window.guiders.getConsentState();
// Retorna: { status, timestamp, version, preferences }

// Otorgar consentimiento completo
window.guiders.grantConsent();

// Otorgar con preferencias específicas
window.guiders.grantConsentWithPreferences({
  analytics: true,
  functional: true,
  personalization: false
});

// Denegar consentimiento
window.guiders.denyConsent();

// Revocar consentimiento
window.guiders.revokeConsent();

// Verificar si está otorgado
const isGranted = window.guiders.isConsentGranted();

// Verificar categoría específica
const analyticsAllowed = window.guiders.isCategoryAllowed('analytics');

// Exportar datos del usuario (GDPR Right to Access)
const data = await window.guiders.exportVisitorData();
console.log(data);

// Eliminar datos del usuario (GDPR Right to Erasure)
await window.guiders.deleteVisitorData();

// Reabrir modal de preferencias
window.guidersShowPreferences();
```

## 🔄 Sincronización con Backend

### Automática

Cuando el visitante está **identificado**, todos los cambios de consentimiento se sincronizan automáticamente con el backend GDPR:

```javascript
// 1. Usuario acepta consentimiento
window.guiders.grantConsent();
// → Guarda localmente en localStorage
// → Envía al backend: POST /api/consents/grant

// 2. Usuario revoca consentimiento
window.guiders.revokeConsent();
// → Actualiza localStorage
// → Envía al backend: POST /api/consents/revoke

// 3. Usuario elimina datos
await window.guiders.deleteVisitorData();
// → Limpia localStorage
// → Envía al backend: DELETE /api/consents/visitors/:id
```

### Mapeo de Categorías

El SDK mapea automáticamente las categorías locales a los tipos del backend:

| SDK Category        | Backend Type      |
|---------------------|-------------------|
| `analytics`         | `analytics`       |
| `functional`        | `privacy_policy`  |
| `personalization`   | `marketing`       |

## 🎨 Personalización

### Modificar Estilos del Banner

Edita `/demo/app/partials/gdpr-banner.php` (líneas 2-250):

```css
#gdpr-consent-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Cambia los colores aquí */
}
```

### Modificar Textos

```php
<!-- En gdpr-banner.php -->
<h3>🍪 Utilizamos cookies</h3>
<p>
  Usamos cookies propias y de terceros... <!-- Modifica el texto aquí -->
</p>
```

### Añadir Más Categorías

Si necesitas más categorías de cookies:

1. Añade el checkbox en el modal:
```html
<div class="gdpr-preference-item">
  <div class="gdpr-preference-header">
    <h4>Cookies Publicitarias</h4>
    <label class="gdpr-toggle">
      <input type="checkbox" id="pref-advertising">
      <span class="gdpr-toggle-slider"></span>
    </label>
  </div>
  <p class="gdpr-preference-description">...</p>
</div>
```

2. Actualiza el JavaScript:
```javascript
const preferences = {
  analytics: prefAnalytics.checked,
  functional: true,
  personalization: prefPersonalization.checked,
  advertising: prefAdvertising.checked // Nueva categoría
};
```

## 📱 Responsive

El banner y el modal son completamente responsive:

- **Desktop:** Banner horizontal en la parte inferior
- **Mobile:** Banner adaptado con botones en columna
- **Modal:** Se ajusta al tamaño de pantalla

## 🧪 Probar el Sistema

### 1. Probar Banner Inicial

```bash
# Limpiar localStorage
localStorage.clear();

# Recargar la página
location.reload();

# El banner debe aparecer automáticamente
```

### 2. Probar Preferencias Granulares

1. Clic en "⚙️ Preferencias"
2. Desactiva "Cookies de Análisis"
3. Mantén "Cookies de Personalización"
4. Clic en "Aceptar Selección"
5. Verifica en consola:
```javascript
window.guiders.getConsentState();
// preferences.analytics: false
// preferences.personalization: true
```

### 3. Probar Exportación de Datos

```javascript
const data = await window.guiders.exportVisitorData();
console.log(JSON.parse(data));
```

El archivo exportado incluye:
- ✅ Estado de consentimiento local
- ✅ Datos de consentimiento del backend
- ✅ Fingerprint y sessionId
- ✅ localStorage relevante
- ✅ Fecha de exportación

### 4. Probar Eliminación de Datos

```javascript
await window.guiders.deleteVisitorData();
// Se limpia localStorage
// Se eliminan datos del backend
// La página se recarga
```

## 🔍 Debugging

### Ver Estado en Consola

```javascript
// Estado completo
console.log(window.guiders.getConsentState());

// Solo status
console.log(window.guiders.getConsentStatus());

// Verificar categorías
console.log({
  analytics: window.guiders.isCategoryAllowed('analytics'),
  functional: window.guiders.isCategoryAllowed('functional'),
  personalization: window.guiders.isCategoryAllowed('personalization')
});
```

### Logs Automáticos

El sistema incluye logs detallados:

```
[GDPR Banner] 🔐 Sistema de consentimiento inicializado
[GDPR Banner] 📊 Estado de consentimiento: pending
[GDPR Banner] ✅ Usuario aceptó todas las cookies
[TrackingPixelSDK] ✅ Consentimiento otorgado - habilitando tracking
[TrackingPixelSDK] 🔄 Consentimiento completo sincronizado con backend
```

## ⚖️ Cumplimiento Legal

### GDPR (Reglamento General de Protección de Datos)

✅ **Art. 7 - Condiciones para el consentimiento:**
- Consentimiento explícito (no pre-marcado)
- Información clara sobre el uso de datos
- Opción de rechazar

✅ **Art. 15 - Derecho de acceso:**
- `exportVisitorData()` permite descargar todos los datos

✅ **Art. 17 - Derecho al olvido:**
- `deleteVisitorData()` elimina todos los datos

✅ **Consentimiento granular:**
- Permite aceptar/rechazar por categoría
- Cookies funcionales siempre activas (legitimamente necesarias)

### LOPDGDD (Ley Orgánica de Protección de Datos - España)

✅ Cumple con requisitos de consentimiento informado
✅ Permite ejercer derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)

### LSSI (Ley de Servicios de la Sociedad de la Información - España)

✅ Información clara sobre el uso de cookies
✅ Consentimiento previo antes de instalar cookies no necesarias

## 🆘 Troubleshooting

### El banner no aparece

1. Verifica que el SDK esté cargado:
```javascript
console.log(window.guiders); // Debe existir
```

2. Verifica el estado:
```javascript
console.log(window.guiders.getConsentStatus());
// Si es 'granted' o 'denied', el banner no aparece
```

3. Fuerza la aparición limpiando el estado:
```javascript
localStorage.removeItem('guiders_consent_state');
location.reload();
```

### El modal no se abre

```javascript
// Verifica que la función esté disponible
console.log(typeof window.guidersShowPreferences); // Debe ser 'function'

// Intenta abrirlo manualmente
window.guidersShowPreferences();
```

### La sincronización con backend falla

1. Verifica que el visitante esté identificado:
```javascript
console.log(window.guiders.getVisitorId()); // No debe ser null
```

2. Verifica el sessionId:
```javascript
console.log(sessionStorage.getItem('guiders_backend_session_id'));
```

3. Revisa los logs de red en DevTools (Network tab)

## 📚 Referencias

- [GDPR_CONSENT.md](../consent/GDPR_CONSENT.md) - Guía general del SDK
- [WORDPRESS_GDPR_GUIDE.md](../../wordpress-plugin/WORDPRESS_GDPR_GUIDE.md) - Guía para WordPress
- [GDPR_QUICKSTART.md](../../wordpress-plugin/guiders-wp-plugin/GDPR_QUICKSTART.md) - Inicio rápido

## 💬 Soporte

- 🐛 Issues: [GitHub](https://github.com/RogerPugaRuiz/guiders-sdk/issues)
- 📧 Email: support@guiders.com
- 📖 Documentación: [docs.guiders.com](https://docs.guiders.com)
