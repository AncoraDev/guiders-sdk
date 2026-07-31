# Guía de Cumplimiento GDPR - Control de Consentimiento

## 📋 Índice

1. [Introducción](#introducción)
2. [Responsabilidades Legales](#responsabilidades-legales)
3. [APIs de Consentimiento](#apis-de-consentimiento)
4. [Ejemplos de Integración](#ejemplos-de-integración)
5. [Integración con Gestores de Consentimiento](#integración-con-gestores-de-consentimiento)
6. [Derechos GDPR](#derechos-gdpr)

---

## Introducción

Guiders SDK proporciona APIs completas para control de consentimiento que permiten cumplir con GDPR, LOPDGDD y LSSI en España y la UE.

### 🔍 Tecnologías de Almacenamiento Utilizadas

**IMPORTANTE**: El SDK utiliza **localStorage** (no cookies de terceros) para almacenar datos en el navegador:

| Tecnología | Uso | Datos Almacenados |
|------------|-----|-------------------|
| **localStorage** | Almacenamiento persistente en el navegador | `fingerprint`, `visitorId`, `consent_preferences`, `guiders_event_queue`, `chat_history`, `session_data` |
| **sessionStorage** | Almacenamiento temporal de sesión | Datos de sesión temporal |
| **Cookies HttpOnly** (servidor) | Autenticación segura (modo `authMode: 'session'`) | Cookie de sesión establecida por el backend (no accesible por JavaScript) |

**Por qué esto requiere consentimiento GDPR**:
- localStorage y sessionStorage son **"tecnologías similares"** bajo la Directiva ePrivacy
- Almacenan **datos personales** (identificadores únicos, comportamiento del usuario)
- Requieren **consentimiento explícito** igual que las cookies (Art. 22 LSSI)
- GDPR aplica a **cualquier procesamiento de datos personales**, sin importar el método de almacenamiento

### ⚖️ Responsabilidad del Consentimiento

**IMPORTANTE**: El **propietario del sitio web** es el responsable de:
- ✅ Mostrar el banner de consentimiento
- ✅ Obtener el consentimiento explícito del usuario
- ✅ Documentar las decisiones de consentimiento

**Guiders SDK** proporciona:
- ✅ APIs para pausar/reanudar tracking
- ✅ Control granular por categorías
- ✅ Métodos para eliminar datos (Right to Erasure)
- ✅ Exportación de datos (Right to Access)

---

## Responsabilidades Legales

### El Propietario del Sitio Web debe:

1. **Implementar Banner de Consentimiento**
   - Usar soluciones como Cookiebot, OneTrust, o custom
   - Obtener consentimiento ANTES de iniciar tracking
   - Documentar preferencias del usuario
   - **Mencionar localStorage** en el banner (no solo "cookies")

2. **Gestionar el Consentimiento**
   - Permitir al usuario modificar preferencias
   - Respetar la decisión de rechazar almacenamiento local
   - Renovar consentimiento cuando sea necesario

3. **Política de Privacidad**
   - Documentar qué datos se recopilan y dónde se almacenan (localStorage, servidor)
   - Explicar para qué se usan
   - Incluir información de contacto del DPO (si aplica)
   - **Especificar que se usa localStorage y cookies HttpOnly**

### Guiders SDK proporciona:

1. **Control de Tracking**
   - Pausar tracking hasta obtener consentimiento
   - Reanudar tracking cuando se otorga consentimiento
   - Detener tracking si se deniega consentimiento
   - **Limpiar localStorage** cuando se deniega consentimiento

2. **Categorías de Consentimiento**
   - `analytics`: Tracking de eventos y análisis (almacenado en localStorage)
   - `functional`: Chat y funcionalidad básica (localStorage + cookies HttpOnly)
   - `personalization`: Personalización del chat (localStorage)

3. **Derechos del Usuario**
   - Eliminar todos los datos almacenados (localStorage + servidor)
   - Exportar datos personales (incluye datos de localStorage)
   - Revocar consentimiento en cualquier momento

---

## APIs de Consentimiento

### Inicialización con Control de Consentimiento

```javascript
const sdk = new TrackingPixelSDK({
  apiKey: 'tu-api-key',
  consent: {
    // Si true, NO hará tracking hasta obtener consentimiento
    waitForConsent: true,

    // Estado inicial: 'pending' | 'granted' | 'denied'
    defaultStatus: 'pending',

    // Callback cuando cambia el consentimiento
    onConsentChange: (state) => {
      console.log('Consentimiento cambiado:', state);
      // { status: 'granted', timestamp: 1234567890, version: '1.2.1', preferences: {...} }
    }
  }
});

// Inicializar SDK
await sdk.init();
// Si waitForConsent es true, el SDK NO iniciará tracking automáticamente
```

### Otorgar Consentimiento

```javascript
// Otorgar consentimiento completo (todas las categorías)
sdk.grantConsent();

// Otorgar consentimiento con preferencias específicas
sdk.grantConsentWithPreferences({
  analytics: true,      // Permitir tracking de eventos
  functional: true,     // Permitir chat
  personalization: false // No permitir personalización
});
```

### Denegar o Revocar Consentimiento

```javascript
// Denegar consentimiento (primera vez)
sdk.denyConsent();

// Revocar consentimiento previamente otorgado
sdk.revokeConsent();
```

### Consultar Estado de Consentimiento

```javascript
// Verificar si el consentimiento fue otorgado
const isGranted = sdk.isConsentGranted();

// Obtener estado de consentimiento
const status = sdk.getConsentStatus(); // 'pending' | 'granted' | 'denied'

// Obtener estado completo con preferencias
const state = sdk.getConsentState();
// {
//   status: 'granted',
//   timestamp: 1234567890,
//   version: '1.2.1',
//   preferences: {
//     analytics: true,
//     functional: true,
//     personalization: false
//   }
// }

// Verificar si una categoría específica está permitida
const canTrack = sdk.isCategoryAllowed('analytics');
const canChat = sdk.isCategoryAllowed('functional');
```

### Suscribirse a Cambios de Consentimiento

```javascript
// Suscribirse a cambios de consentimiento
const unsubscribe = sdk.subscribeToConsentChanges((state) => {
  console.log('Nuevo estado de consentimiento:', state);

  if (state.status === 'granted') {
    console.log('✅ Consentimiento otorgado');
    // Habilitar funcionalidades que requieren consentimiento
  }

  if (state.status === 'denied') {
    console.log('❌ Consentimiento denegado');
    // Deshabilitar tracking
  }
});

// Cancelar suscripción
unsubscribe();
```

---

## Ejemplos de Integración

### Ejemplo 1: Banner de Consentimiento Básico

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mi Sitio con Guiders</title>
</head>
<body>
  <!-- Banner de consentimiento -->
  <div id="consent-banner" style="display: none; position: fixed; bottom: 0; width: 100%; background: #333; color: white; padding: 20px;">
    <p>Este sitio procesa datos personales (incluido almacenamiento local en tu navegador) para mejorar tu experiencia. ¿Aceptas?</p>
    <button id="accept-all">Aceptar Todo</button>
    <button id="accept-functional">Solo Funcionales</button>
    <button id="reject-all">Rechazar</button>
  </div>

  <script type="module">
    import { TrackingPixelSDK } from 'guiders-pixel';

    // Inicializar SDK con consentimiento pendiente
    const sdk = new TrackingPixelSDK({
      apiKey: 'tu-api-key',
      consent: {
        waitForConsent: true,
        defaultStatus: 'pending'
      }
    });

    await sdk.init();

    // Mostrar banner si no hay consentimiento previo
    if (sdk.getConsentStatus() === 'pending') {
      document.getElementById('consent-banner').style.display = 'block';
    }

    // Aceptar todo
    document.getElementById('accept-all').addEventListener('click', () => {
      sdk.grantConsent();
      document.getElementById('consent-banner').style.display = 'none';
    });

    // Solo funcionales
    document.getElementById('accept-functional').addEventListener('click', () => {
      sdk.grantConsentWithPreferences({
        analytics: false,
        functional: true,
        personalization: false
      });
      document.getElementById('consent-banner').style.display = 'none';
    });

    // Rechazar
    document.getElementById('reject-all').addEventListener('click', () => {
      sdk.denyConsent();
      document.getElementById('consent-banner').style.display = 'none';
    });
  </script>
</body>
</html>
```

### Ejemplo 2: Configuración de Preferencias

```html
<div id="preferences-modal">
  <h2>Preferencias de Privacidad</h2>

  <label>
    <input type="checkbox" id="analytics" checked>
    Analíticas (tracking de eventos en localStorage)
  </label>

  <label>
    <input type="checkbox" id="functional" checked>
    Funcionales (chat en vivo, almacenamiento local + cookies HttpOnly)
  </label>

  <label>
    <input type="checkbox" id="personalization" checked>
    Personalización (preferencias en localStorage)
  </label>

  <button id="save-preferences">Guardar Preferencias</button>
</div>

<script type="module">
  import { TrackingPixelSDK } from 'guiders-pixel';

  const sdk = new TrackingPixelSDK({
    apiKey: 'tu-api-key',
    consent: { waitForConsent: true }
  });

  await sdk.init();

  document.getElementById('save-preferences').addEventListener('click', () => {
    sdk.grantConsentWithPreferences({
      analytics: document.getElementById('analytics').checked,
      functional: document.getElementById('functional').checked,
      personalization: document.getElementById('personalization').checked
    });

    // Cerrar modal
    document.getElementById('preferences-modal').style.display = 'none';
  });
</script>
```

---

## Integración con Gestores de Consentimiento

### Cookiebot

```javascript
import { TrackingPixelSDK } from 'guiders-pixel';

const sdk = new TrackingPixelSDK({
  apiKey: 'tu-api-key',
  consent: { waitForConsent: true }
});

await sdk.init();

// Escuchar evento de Cookiebot
window.addEventListener('CookiebotOnAccept', function() {
  if (Cookiebot.consent.statistics && Cookiebot.consent.marketing) {
    sdk.grantConsent();
  } else {
    sdk.grantConsentWithPreferences({
      analytics: Cookiebot.consent.statistics,
      functional: Cookiebot.consent.necessary,
      personalization: Cookiebot.consent.marketing
    });
  }
});

window.addEventListener('CookiebotOnDecline', function() {
  sdk.denyConsent();
});
```

### OneTrust

```javascript
import { TrackingPixelSDK } from 'guiders-pixel';

const sdk = new TrackingPixelSDK({
  apiKey: 'tu-api-key',
  consent: { waitForConsent: true }
});

await sdk.init();

// Escuchar evento de OneTrust
window.OptanonWrapper = function() {
  const activeGroups = window.OptanonActiveGroups || '';

  sdk.grantConsentWithPreferences({
    analytics: activeGroups.includes('C0002'),     // Performance Cookies
    functional: activeGroups.includes('C0003'),    // Functional Cookies
    personalization: activeGroups.includes('C0004') // Targeting Cookies
  });
};
```

### Consent Mode API (Google)

```javascript
import { TrackingPixelSDK } from 'guiders-pixel';

const sdk = new TrackingPixelSDK({
  apiKey: 'tu-api-key',
  consent: { waitForConsent: true }
});

await sdk.init();

// Sincronizar con Google Consent Mode
sdk.subscribeToConsentChanges((state) => {
  gtag('consent', 'update', {
    'analytics_storage': state.preferences?.analytics ? 'granted' : 'denied',
    'functionality_storage': state.preferences?.functional ? 'granted' : 'denied',
    'personalization_storage': state.preferences?.personalization ? 'granted' : 'denied'
  });
});
```

---

## Derechos GDPR

### Right to Erasure (Derecho al Olvido)

```javascript
// Eliminar TODOS los datos del visitante
await sdk.deleteVisitorData();

// Esto elimina:
// - Datos en localStorage
// - Fingerprint
// - Session ID
// - Estado de consentimiento
// - Solicita eliminación en el servidor
```

**Ejemplo de implementación en tu sitio:**

```html
<button id="delete-my-data">Eliminar mis datos</button>

<script type="module">
  import { TrackingPixelSDK } from 'guiders-pixel';

  const sdk = new TrackingPixelSDK({ apiKey: 'tu-api-key' });
  await sdk.init();

  document.getElementById('delete-my-data').addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos tus datos?')) {
      try {
        await sdk.deleteVisitorData();
        alert('Tus datos han sido eliminados exitosamente');
      } catch (error) {
        alert('Error eliminando datos: ' + error.message);
      }
    }
  });
</script>
```

### Right to Access (Derecho de Acceso)

```javascript
// Exportar todos los datos del visitante
const dataJSON = await sdk.exportVisitorData();

// Descargar como archivo
const blob = new Blob([dataJSON], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `guiders-data-${Date.now()}.json`;
a.click();
```

**Ejemplo completo:**

```html
<button id="download-my-data">Descargar mis datos</button>

<script type="module">
  import { TrackingPixelSDK } from 'guiders-pixel';

  const sdk = new TrackingPixelSDK({ apiKey: 'tu-api-key' });
  await sdk.init();

  document.getElementById('download-my-data').addEventListener('click', async () => {
    try {
      const dataJSON = await sdk.exportVisitorData();

      // Descargar como archivo
      const blob = new Blob([dataJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guiders-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert('Tus datos se han descargado exitosamente');
    } catch (error) {
      alert('Error exportando datos: ' + error.message);
    }
  });
</script>
```

---

## Categorías de Datos Recopilados

### Analytics (Analíticas)
**Almacenamiento**: localStorage (`guiders_event_queue`)
- Eventos de tracking personalizados
- Eventos de sesión (inicio, fin, duración)
- Eventos DOM (clicks en botones, formularios, etc.)
- Métricas de interacción con el chat

### Functional (Funcionales)
**Almacenamiento**: localStorage (`fingerprint`, `visitorId`, `session_data`) + cookies HttpOnly (servidor)
- Fingerprint del navegador (para identificación única)
- Session ID (identificador de sesión)
- Chat ID (identificador de conversación)
- Mensajes del chat (historial local)
- Estado de disponibilidad de comerciales
- Cookie de autenticación (HttpOnly, establecida por el servidor)

### Personalization (Personalización)
**Almacenamiento**: localStorage (`chat_history`, preferencias)
- Preferencias del usuario
- Historial de chats (mensajes previos)
- Configuración de mensajes de bienvenida personalizados

### Detalles Técnicos de Almacenamiento

| Clave localStorage | Contenido | Categoría GDPR |
|-------------------|-----------|----------------|
| `fingerprint` | Hash único del navegador | Funcional |
| `visitorId` | UUID del visitante | Funcional |
| `consent_preferences` | Preferencias de consentimiento | Necesario (excepto) |
| `guiders_event_queue` | Cola de eventos pendientes | Analytics |
| `chat_history` | Mensajes de chat locales | Funcional/Personalización |
| `session_data` | Datos de sesión activa | Funcional |

**Nota**: La clave `consent_preferences` se considera **estrictamente necesaria** y se almacena incluso si el usuario rechaza todo, ya que registra su decisión de consentimiento.

---

## FAQ - Preguntas Frecuentes

### ¿Quién es responsable del banner de consentimiento?

El **propietario del sitio web** es responsable de mostrar el banner y obtener el consentimiento. Guiders SDK solo proporciona las APIs para controlar el tracking una vez obtenido el consentimiento.

### ¿Puedo usar el SDK sin consentimiento?

Sí, puedes configurar `waitForConsent: false` para que el SDK funcione sin esperar consentimiento explícito. Sin embargo, **esto solo es legal si**:
- Tu sitio no está dirigido a usuarios de la UE/EEA, O
- Solo usas cookies estrictamente necesarias

### ¿Qué pasa si el usuario rechaza el procesamiento de datos?

El SDK:
- Detendrá todo tracking de eventos
- NO generará ni almacenará fingerprints en localStorage
- Limpiará los datos existentes de localStorage (excepto `consent_preferences`)
- Permitirá el chat solo si el usuario acepta procesamiento funcional
- Respetará la decisión del usuario en visitas futuras (persistida en localStorage)

### ¿Se puede revocar el consentimiento?

Sí, el usuario puede revocar el consentimiento en cualquier momento usando:
```javascript
sdk.revokeConsent();
```

### ¿Los datos se almacenan en el servidor?

Sí, algunos datos (visitorId, sessionId, mensajes de chat) se almacenan en nuestros servidores. El usuario puede solicitar la eliminación usando `sdk.deleteVisitorData()`.

### ¿Cumple esto con GDPR?

Sí, si lo implementas correctamente:
- ✅ Obtén consentimiento ANTES de iniciar tracking
- ✅ Permite al usuario gestionar preferencias
- ✅ Implementa los derechos de acceso y eliminación
- ✅ Documenta todo en tu política de privacidad

---

## Recursos Adicionales

- [Guía GDPR (ICO UK)](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [AEPD España - Guía de Cookies](https://www.aepd.es/es/documento/guia-cookies.pdf)
- [LOPDGDD - Ley Orgánica de Protección de Datos](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673)

---

## Soporte

Si tienes dudas sobre la implementación del control de consentimiento:

- 📧 Email: support@guiders.com
- 📖 Documentación: https://docs.guiders.com
- 🐛 Issues: https://github.com/guiders/guiders-sdk/issues
