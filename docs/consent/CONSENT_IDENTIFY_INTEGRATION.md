# Integración de Consentimiento en Endpoint Identity

## 📝 Cambios Realizados

El endpoint `/api/visitors/identify` ahora incluye información de consentimiento GDPR en cada petición.

### Formato del Endpoint

```bash
curl -X POST http://localhost:3000/api/visitors/identify \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "2714824192",
    "domain": "127.0.0.1",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": true,
    "consentVersion": "v1.0"
  }'
```

### Nuevos Campos

| Campo                       | Tipo    | Descripción                                          |
|----------------------------|---------|------------------------------------------------------|
| `hasAcceptedPrivacyPolicy` | boolean | Indica si el usuario ha aceptado la política de privacidad |
| `consentVersion`           | string  | Versión del consentimiento otorgado (ej: "v1.0")    |

## 🔧 Implementación Técnica

### 1. Servicio de Visitantes (`visitors-v2-service.ts`)

**Cambios en el método `identify`:**

```typescript
public async identify(
  fingerprint: string,
  apiKey?: string,
  consentInfo?: {
    hasAcceptedPrivacyPolicy: boolean;
    consentVersion: string;
  }
): Promise<IdentifyVisitorResponse | null>
```

**Funcionalidades:**
- ✅ Acepta parámetro opcional `consentInfo`
- ✅ Si no se proporciona, **lee automáticamente** del localStorage (`guiders_consent_state`)
- ✅ Valores por defecto: `hasAcceptedPrivacyPolicy: false`, `consentVersion: "v1.0"`
- ✅ Logs detallados del estado de consentimiento enviado

**Ejemplo de payload enviado:**
```json
{
  "fingerprint": "2714824192",
  "domain": "localhost",
  "apiKey": "12ca17b49af...",
  "hasAcceptedPrivacyPolicy": true,
  "consentVersion": "1.2.2-alpha.1"
}
```

### 2. Identity Signal (`identity-signal.ts`)

**Cambios en el método `identify`:**

```typescript
public async identify(fingerprint: string, apiKey?: string): Promise<IdentityWithChatsData>
```

**Funcionalidades:**
- ✅ Lee automáticamente el estado de consentimiento de localStorage
- ✅ Parsea el JSON de `guiders_consent_state`
- ✅ Extrae `status` (pending/granted/denied) y `version`
- ✅ Convierte `status === 'granted'` a `hasAcceptedPrivacyPolicy: true`
- ✅ Pasa `consentInfo` al servicio de visitantes
- ✅ Logs detallados del consentimiento detectado

**Lógica de detección:**
```typescript
// Lee de localStorage
const consentStateStr = localStorage.getItem('guiders_consent_state');
const consentState = JSON.parse(consentStateStr);

// Construye consentInfo
const consentInfo = {
  hasAcceptedPrivacyPolicy: consentState.status === 'granted',
  consentVersion: consentState.version || 'v1.0'
};
```

## 🔄 Flujo Completo

### Escenario 1: Usuario sin consentimiento (primera visita)

```javascript
// 1. Usuario visita el sitio
// → ConsentManager: status = 'pending'
// → localStorage: { status: 'pending', version: '1.2.2-alpha.1' }

// 2. SDK intenta identificar
identitySignal.identify(fingerprint, apiKey);

// 3. Payload enviado al backend:
{
  "fingerprint": "...",
  "domain": "...",
  "apiKey": "...",
  "hasAcceptedPrivacyPolicy": false,  // ← status !== 'granted'
  "consentVersion": "1.2.2-alpha.1"
}

// 4. Backend recibe y guarda que NO hay consentimiento aún
```

### Escenario 2: Usuario acepta consentimiento

```javascript
// 1. Usuario acepta en el banner
window.guiders.grantConsent();

// 2. ConsentManager actualiza localStorage:
// → { status: 'granted', version: '1.2.2-alpha.1', preferences: {...} }

// 3. Si hay re-identificación (refresh, nueva sesión):
identitySignal.identify(fingerprint, apiKey);

// 4. Payload enviado al backend:
{
  "fingerprint": "...",
  "domain": "...",
  "apiKey": "...",
  "hasAcceptedPrivacyPolicy": true,  // ← status === 'granted'
  "consentVersion": "1.2.2-alpha.1"
}

// 5. Backend actualiza el registro con consentimiento otorgado
```

### Escenario 3: Usuario rechaza consentimiento

```javascript
// 1. Usuario rechaza en el banner
window.guiders.denyConsent();

// 2. ConsentManager actualiza localStorage:
// → { status: 'denied', version: '1.2.2-alpha.1', preferences: {...} }

// 3. Próxima identificación:
{
  "hasAcceptedPrivacyPolicy": false,  // ← status === 'denied'
  "consentVersion": "1.2.2-alpha.1"
}
```

## 📊 Logs Esperados

### Console Logs en el Navegador

```
[IdentitySignal] 🚀 Iniciando identificación del visitante...
[IdentitySignal] 🔐 Estado de consentimiento: { hasAcceptedPrivacyPolicy: true, consentVersion: "1.2.2-alpha.1" }
[VisitorsV2Service] 🔐 Enviando identify con consentimiento: { hasAcceptedPrivacyPolicy: true, consentVersion: "1.2.2-alpha.1" }
[VisitorsV2Service] ✅ identify OK: visitor-123 session: sess-abc
[IdentitySignal] ✅ Visitante identificado: visitor-123
```

### Network Tab (DevTools)

**Request:**
```http
POST /api/visitors/identify HTTP/1.1
Content-Type: application/json

{
  "fingerprint": "2714824192",
  "domain": "localhost",
  "apiKey": "12ca17b49af...",
  "hasAcceptedPrivacyPolicy": true,
  "consentVersion": "1.2.2-alpha.1"
}
```

**Response:**
```json
{
  "visitorId": "visitor-123",
  "sessionId": "sess-abc",
  "name": null,
  "email": null,
  "tel": null
}
```

## 🧪 Testing

### Test Manual

1. **Sin consentimiento:**
```javascript
// Limpiar estado
localStorage.removeItem('guiders_consent_state');
localStorage.removeItem('visitorId');

// Recargar página
location.reload();

// Verificar en Network tab → identify:
// hasAcceptedPrivacyPolicy: false
```

2. **Con consentimiento:**
```javascript
// Aceptar consentimiento
window.guiders.grantConsent();

// Forzar re-identificación
localStorage.removeItem('visitorId');
location.reload();

// Verificar en Network tab → identify:
// hasAcceptedPrivacyPolicy: true
```

3. **Consentimiento denegado:**
```javascript
// Denegar consentimiento
window.guiders.denyConsent();

// Forzar re-identificación
localStorage.removeItem('visitorId');
location.reload();

// Verificar en Network tab → identify:
// hasAcceptedPrivacyPolicy: false
```

### Test con cURL

```bash
# Test con consentimiento
curl -X POST http://localhost:3000/api/visitors/identify \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "test-123",
    "domain": "localhost",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": true,
    "consentVersion": "v1.0"
  }'

# Test sin consentimiento
curl -X POST http://localhost:3000/api/visitors/identify \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "test-456",
    "domain": "localhost",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": false,
    "consentVersion": "v1.0"
  }'
```

## 🔍 Debugging

### Ver estado de consentimiento en localStorage

```javascript
// Ver estado guardado
const state = localStorage.getItem('guiders_consent_state');
console.log(JSON.parse(state));

// Ejemplo de output:
{
  status: "granted",
  timestamp: 1696888888888,
  version: "1.2.2-alpha.1",
  preferences: {
    analytics: true,
    functional: true,
    personalization: true
  }
}
```

### Interceptar petición de identify

```javascript
// Hook para ver todas las peticiones
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/identify')) {
    console.log('🔍 Identify request:', JSON.parse(args[1].body));
  }
  return originalFetch.apply(this, args);
};
```

## ⚠️ Consideraciones Importantes

### 1. Retrocompatibilidad

El cambio es **totalmente retrocompatible**:
- ✅ Si el backend antiguo no espera estos campos, los ignorará
- ✅ Los campos siempre se envían (nunca `undefined`)
- ✅ Valores por defecto seguros: `hasAcceptedPrivacyPolicy: false`

### 2. Timing

La información de consentimiento se envía:
- ✅ En la primera identificación del visitante
- ✅ En cada refresh/recarga de página (nueva sesión)
- ✅ NO en el heartbeat (solo en identify)

### 3. Persistencia

El estado de consentimiento persiste en:
- ✅ `localStorage.guiders_consent_state` (estado local)
- ✅ Backend GDPR (vía `/api/consents/grant`, `/api/consents/revoke`)
- ✅ Backend Visitors (vía `/api/visitors/identify`)

### 4. Prioridad de datos

Si se pasa `consentInfo` explícitamente al método `identify()`:
```javascript
// Uso explícito (override del localStorage)
await VisitorsV2Service.getInstance().identify(
  fingerprint,
  apiKey,
  { hasAcceptedPrivacyPolicy: true, consentVersion: 'v2.0' }
);
```

Sino, se usa el estado de localStorage automáticamente.

## 📈 Próximas Mejoras

### Mejoras sugeridas para el backend:

1. **Validar consentVersion:**
   - Rechazar versiones antiguas
   - Forzar re-consentimiento si la versión cambió

2. **Audit Trail:**
   - Registrar cada cambio de `hasAcceptedPrivacyPolicy`
   - Guardar timestamp de aceptación/rechazo

3. **Webhook de consentimiento:**
   - Notificar cuando cambia el estado
   - Integrar con sistemas CRM

4. **Dashboard:**
   - Visualizar tasa de aceptación de consentimiento
   - Filtrar visitantes por estado de consentimiento

## 📚 Referencias

- [GDPR_CONSENT.md](./GDPR_CONSENT.md) - Sistema de consentimiento del SDK
- [CONSENT_IDENTIFY_INTEGRATION.md](./CONSENT_IDENTIFY_INTEGRATION.md) - Este documento
- [visitors-v2-service.ts](../../src/services/visitors-v2-service.ts) - Implementación del servicio
- [identity-signal.ts](../../src/core/identity-signal.ts) - Implementación del signal

## 🆘 Troubleshooting

### Los campos no llegan al backend

1. Verificar que el SDK esté actualizado (1.2.2-alpha.1+)
2. Verificar logs en consola:
   ```
   [VisitorsV2Service] 🔐 Enviando identify con consentimiento: {...}
   ```
3. Verificar en Network tab que el payload incluya los campos

### hasAcceptedPrivacyPolicy siempre es false

1. Verificar que el usuario haya aceptado:
   ```javascript
   window.guiders.getConsentStatus(); // Debe ser 'granted'
   ```
2. Verificar localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('guiders_consent_state'));
   ```
3. Verificar que no se esté limpiando el localStorage entre operaciones

### consentVersion incorrecta

1. El SDK usa la versión del package.json: `1.2.2-alpha.1`
2. Para cambiar la versión, modificar en `ConsentManager.getInstance({ version: '...' })`
3. Verificar en localStorage la versión guardada
