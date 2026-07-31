# Mensaje de Consentimiento del Chat

Guiders SDK ahora incluye un mensaje de consentimiento del chat similar al de Zara, que confirma que el usuario ha leído las políticas de privacidad al unirse al chat.

## 🎯 Características

- ✅ Mensaje personalizable con enlaces a políticas
- ✅ Se muestra antes del mensaje de bienvenida
- ✅ Opción de mostrar solo una vez por sesión
- ✅ Diseño responsivo para móvil y desktop
- ✅ Enlaces clickeables con efecto hover
- ✅ Totalmente configurable y opcional

## 📋 Configuración

### Configuración Completa

```typescript
const sdk = new TrackingPixelSDK({
  apiKey: 'YOUR_API_KEY',

  // Configuración del mensaje de consentimiento del chat
  chatConsentMessage: {
    enabled: true,
    message: 'Al unirte al chat, confirmas que has leído y entiendes nuestra',
    privacyPolicyUrl: '/privacy-policy',
    privacyPolicyText: 'Política de Privacidad',
    cookiesPolicyUrl: '/cookies-policy',
    cookiesPolicyText: 'Política de Cookies',
    showOnce: true // Mostrar solo una vez por sesión
  }
});

sdk.init();
```

### Configuración Mínima (Valores por Defecto)

```typescript
const sdk = new TrackingPixelSDK({
  apiKey: 'YOUR_API_KEY',

  chatConsentMessage: {
    enabled: true // Usa valores por defecto
  }
});
```

### Valores por Defecto

Si no especificas los valores, se usarán estos por defecto:

```typescript
{
  enabled: false,
  message: 'Al unirte al chat, confirmas que has leído y entiendes nuestra',
  privacyPolicyUrl: '/privacy',
  privacyPolicyText: 'Política de Privacidad',
  cookiesPolicyUrl: '/cookies',
  cookiesPolicyText: 'Política de Cookies',
  showOnce: true
}
```

## 🎨 Apariencia

El mensaje aparece centrado en el chat con:
- Fondo suave (gradiente gris claro)
- Bordes redondeados
- Enlaces azules con efecto hover
- Tipografía clara y legible
- Sombra sutil para destacar

El mensaje se muestra **antes** del mensaje de bienvenida, cuando el chat se abre por primera vez.

## 📝 Opciones de Configuración

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Habilitar el mensaje de consentimiento |
| `message` | `string` | `'Al unirte al chat...'` | Texto del mensaje (sin incluir enlaces) |
| `privacyPolicyUrl` | `string` | `'/privacy'` | URL de la política de privacidad |
| `privacyPolicyText` | `string` | `'Política de Privacidad'` | Texto del enlace de privacidad |
| `cookiesPolicyUrl` | `string` | `'/cookies'` | URL de la política de cookies |
| `cookiesPolicyText` | `string` | `'Política de Cookies'` | Texto del enlace de cookies |
| `showOnce` | `boolean` | `true` | Mostrar solo una vez por sesión |

## 🔧 Uso Avanzado

### Solo Política de Privacidad

```typescript
chatConsentMessage: {
  enabled: true,
  message: 'Al continuar, aceptas nuestra',
  privacyPolicyUrl: '/privacy',
  privacyPolicyText: 'Política de Privacidad',
  cookiesPolicyUrl: undefined, // No mostrar enlace de cookies
  cookiesPolicyText: undefined
}
```

### Mensaje Personalizado

```typescript
chatConsentMessage: {
  enabled: true,
  message: 'Bienvenido. Este chat cumple con',
  privacyPolicyUrl: 'https://example.com/gdpr',
  privacyPolicyText: 'GDPR',
  cookiesPolicyUrl: 'https://example.com/data-protection',
  cookiesPolicyText: 'Protección de Datos'
}
```

### Mostrar Siempre (No Solo Una Vez)

```typescript
chatConsentMessage: {
  enabled: true,
  showOnce: false // Se mostrará cada vez que se abra el chat
}
```

## 🚀 Demo

Abre el archivo de ejemplo para ver el mensaje en acción:

```bash
open examples/chat-consent-message-demo.html
```

O visita la demo en tu navegador:
```
file:///path/to/guiders-sdk/examples/chat-consent-message-demo.html
```

## 🌍 Internacionalización

Puedes personalizar el mensaje para diferentes idiomas:

### Español
```typescript
chatConsentMessage: {
  enabled: true,
  message: 'Al unirte al chat, confirmas que has leído y entiendes nuestra',
  privacyPolicyText: 'Política de Privacidad',
  cookiesPolicyText: 'Política de Cookies'
}
```

### Inglés
```typescript
chatConsentMessage: {
  enabled: true,
  message: 'By joining the chat, you confirm that you have read and understand our',
  privacyPolicyText: 'Privacy Policy',
  cookiesPolicyText: 'Cookie Policy'
}
```

### Francés
```typescript
chatConsentMessage: {
  enabled: true,
  message: 'En rejoignant le chat, vous confirmez avoir lu et compris notre',
  privacyPolicyText: 'Politique de Confidentialité',
  cookiesPolicyText: 'Politique des Cookies'
}
```

## 🔗 Integración con GDPR

Este mensaje de consentimiento del chat es complementario al banner de consentimiento GDPR. Puedes usarlos juntos:

```typescript
const sdk = new TrackingPixelSDK({
  apiKey: 'YOUR_API_KEY',

  // Banner de consentimiento GDPR (general)
  requireConsent: true,
  consentBanner: {
    enabled: true,
    style: 'bottom_bar'
  },

  // Mensaje de consentimiento del chat (específico del chat)
  chatConsentMessage: {
    enabled: true,
    message: 'Al usar el chat, aceptas nuestra',
    privacyPolicyUrl: '/privacy',
    privacyPolicyText: 'Política de Privacidad'
  }
});
```

## 📱 Responsive Design

El mensaje es totalmente responsive y se adapta automáticamente a:
- 📱 Móvil (pantallas pequeñas)
- 💻 Desktop (pantallas grandes)
- 📐 Tablets

Los estilos se ajustan automáticamente según el tamaño de pantalla.

## ❓ Preguntas Frecuentes

### ¿El mensaje bloquea el uso del chat?
No, es solo informativo. El usuario puede empezar a chatear inmediatamente después de ver el mensaje.

### ¿Se puede omitir el mensaje?
Sí, si configuras `enabled: false`, el mensaje no se mostrará.

### ¿Se puede mostrar después del mensaje de bienvenida?
No, el mensaje de consentimiento se muestra siempre primero para cumplir con buenas prácticas de GDPR.

### ¿Los enlaces se abren en nueva pestaña?
Sí, todos los enlaces se abren en nueva pestaña (`target="_blank"`) con `rel="noopener noreferrer"` para seguridad.

## 🆕 Changelog

### v1.5.3 (2025-01-XX)
- ✨ **Nuevo:** Añadido mensaje de consentimiento del chat similar a Zara
- ✅ Soporte para enlaces personalizables a políticas
- 📱 Diseño responsive automático
- 🎨 Estilos visuales configurables
- 🔧 Opción de mostrar una sola vez por sesión

## 💡 Inspiración

Esta funcionalidad está inspirada en el mensaje de consentimiento del chat de Zara:

> "Al unirte al chat de zara.com, confirmas que has leído y entiendes nuestra Política de Privacidad y Cookies"

## 📄 Licencia

Esta funcionalidad está incluida en Guiders SDK bajo la misma licencia del proyecto principal.
