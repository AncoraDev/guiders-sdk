# 📋 Revisión de Cumplimiento con Guía de Integración GDPR

## 🎯 Objetivo

Verificar si nuestra implementación sigue correctamente la guía oficial de integración del sistema de consentimientos RGPD del backend.

---

## 📖 Flujo Recomendado por la Guía

```
1. Usuario visita el sitio
   ↓
2. Identificar visitante (POST /api/visitors/identify)
   ⚠️ IMPORTANTE: hasAcceptedPrivacyPolicy es OBLIGATORIO
   ↓
3. Obtener token de autenticación del visitante
   ↓
4. Verificar consentimientos existentes (GET /api/consents/visitors/:visitorId)
   ↓
5. Si no hay consentimientos → Mostrar banner
   ↓
6. Usuario acepta/rechaza → Backend registra automáticamente
   ↓
7. Activar servicios según consentimientos otorgados
```

---

## 🔍 Flujo Actual de Nuestro SDK

```
1. Usuario visita el sitio
   ↓
2. SDK carga y verifica localStorage
   ↓
3. Si status === 'pending' → Mostrar banner (NO identificar todavía)
   ↓
4. Usuario acepta en banner
   ↓
5. grantConsent() → Guarda en localStorage
   ↓
6. init() → Verifica consentimiento → SI granted:
   ↓
7. Escribe en localStorage (pixelEndpoint, apiKey, fingerprint)
   ↓
8. executeIdentify() → POST /api/visitors/identify
      { hasAcceptedPrivacyPolicy: true, consentVersion: "1.2.2-alpha.1" }
   ↓
9. Backend registra consentimiento de privacy_policy automáticamente
   ↓
10. ADEMÁS: ConsentBackendService.grantConsents()
      POST /api/consents/grant (para analytics, personalization)
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. 🔴 ORDEN INVERTIDO DEL FLUJO

**Guía recomienda:**
```
Identificar → Verificar consentimientos → Mostrar banner si necesario
```

**Nuestro SDK hace:**
```
Mostrar banner → Aceptar → Identificar
```

**Problema:**
- El usuario NO se identifica hasta que acepta el consentimiento
- Esto significa que visitantes que rechazan o están "pending" NUNCA se identifican
- No podemos trackear "visitantes sin consentimiento" en el backend

**Impacto:**
- 🔴 **Crítico**: Perdemos métricas de cuántos usuarios rechazan cookies
- 🔴 **Crítico**: No podemos implementar remarketing a usuarios que rechazaron

---

### 2. 🟡 hasAcceptedPrivacyPolicy SIEMPRE ENVIADO

**Guía dice:**
> "hasAcceptedPrivacyPolicy: boolean; // ⚠️ OBLIGATORIO"

**Nuestro código actual:**
```typescript
// visitors-v2-service.ts líneas 47-66
let hasAcceptedPrivacyPolicy = false;  // ← Por defecto FALSE

if (consentInfo) {
  hasAcceptedPrivacyPolicy = consentInfo.hasAcceptedPrivacyPolicy;
} else if (typeof localStorage !== 'undefined') {
  const consentState = JSON.parse(localStorage.getItem('guiders_consent_state'));
  hasAcceptedPrivacyPolicy = consentState.status === 'granted';
}
```

**Análisis:**
- ✅ **Correcto**: Se envía el campo (es obligatorio)
- ⚠️ **Dudoso**: Enviamos `false` si no hay consentimiento
- ❓ **Pregunta**: ¿El backend acepta `false` o espera que NO se identifique sin consentimiento?

**Según la guía**, el flujo debería ser:
1. Usuario visita → Se identifica CON hasAcceptedPrivacyPolicy: false
2. Backend crea visitante SIN consentimientos
3. Frontend muestra banner
4. Usuario acepta → Se llama a identify nuevamente CON hasAcceptedPrivacyPolicy: true
5. Backend registra consentimiento de privacy_policy

**Nuestro flujo:**
1. Usuario visita → NO se identifica
2. Usuario acepta → Se identifica CON hasAcceptedPrivacyPolicy: true
3. Backend crea visitante Y consentimiento juntos

**Diferencia:** Nosotros NO identificamos hasta tener consentimiento.

---

### 3. 🟡 POSIBLE DUPLICACIÓN DE CONSENTIMIENTOS

**Guía dice:**
> "Usuario acepta/rechaza → Backend registra automáticamente"

Esto implica que el endpoint `/api/visitors/identify` registra automáticamente el consentimiento de `privacy_policy` cuando `hasAcceptedPrivacyPolicy: true`.

**Nuestro SDK ADEMÁS hace:**
```typescript
// tracking-pixel-SDK.ts líneas 224-229
if (visitorId && state.preferences) {
  this.consentBackendService.grantConsents(visitorId, state.preferences)
    .catch(error => {
      console.error('[TrackingPixelSDK] ❌ Error sincronizando consentimiento con backend:', error);
    });
}
```

**Problema potencial:**
1. `identify` registra consentimiento de `privacy_policy`
2. `grantConsents` intenta registrar `privacy_policy`, `analytics`, `personalization`

Si `privacy_policy` ya existe del paso 1, podríamos:
- Crear duplicado (malo)
- Generar error 409 Conflict (esperado)
- Backend lo ignora silenciosamente (ideal)

**No sabemos qué hace el backend en este caso.**

---

### 4. 🟢 localStorage DESPUÉS DEL CONSENTIMIENTO (CORRECTO)

**Guía no lo menciona explícitamente**, pero nosotros lo implementamos correctamente:

```typescript
// tracking-pixel-SDK.ts líneas 336-339
if (this.consentManager.isGranted()) {
  console.log('[TrackingPixelSDK] 🔐 Consentimiento verificado - guardando configuración');
  localStorage.setItem("pixelEndpoint", this.endpoint);
  localStorage.setItem("guidersApiKey", this.apiKey);
}
```

✅ **Correcto según GDPR/LSSI**: Solo escribimos en localStorage después de verificar consentimiento.

---

### 5. 🟡 SINCRONIZACIÓN CON BACKEND GDPR

**Guía NO menciona** el ConsentBackendService, pero nosotros lo implementamos.

**Nuestro código:**
```typescript
// ConsentBackendService con endpoints:
// - POST /api/consents/grant
// - POST /api/consents/revoke
// - POST /api/consents/renew
// - GET /api/consents/visitors/:id
// - DELETE /api/consents/visitors/:id
```

**Pregunta:** ¿Son estos endpoints adicionales al sistema principal, o son los mismos que usa `/api/visitors/identify`?

**Si son adicionales:**
- ✅ Permite gestión granular de consentimientos
- ⚠️ Posible duplicación con el registro automático de identify

**Si son los mismos:**
- ✅ Correcto, no hay duplicación
- ⚠️ Entonces estamos llamando dos veces al mismo endpoint

---

## 📊 Tabla Comparativa

| Aspecto | Guía | Nuestro SDK | Estado |
|---------|------|-------------|--------|
| **Orden del flujo** | Identificar → Banner | Banner → Identificar | ⚠️ Invertido |
| **hasAcceptedPrivacyPolicy** | Obligatorio | ✅ Enviamos siempre | ✅ Conforme |
| **Identificar sin consentimiento** | Sí (con false) | No identificamos | ⚠️ Diferente |
| **localStorage después consentimiento** | No especificado | ✅ Implementado | ✅ Conforme GDPR |
| **Registro automático en identify** | Sí | Sí | ✅ Conforme |
| **Endpoints adicionales /api/consents** | No mencionados | Implementados | ❓ Posible duplicación |
| **Campo consentVersion** | No mencionado | ✅ Implementado | ➕ Mejora |
| **Sincronización con backend** | Automática en identify | Doble: identify + grantConsents | ⚠️ Posible redundancia |

---

## 🎯 RECOMENDACIONES

### Opción A: Seguir Estrictamente la Guía

**Cambiar el flujo a:**

```typescript
// 1. Identificar SIEMPRE al cargar (con o sin consentimiento)
public async init(): Promise<void> {
  // NO verificar consentimiento aquí
  // Siempre identificar primero

  const client = new ClientJS();
  this.fingerprint = localStorage.getItem("fingerprint") || client.getFingerprint().toString();

  // Identificar con el estado actual de consentimiento
  const consentState = this.consentManager.getState();
  const hasAcceptedPrivacyPolicy = consentState.status === 'granted';

  // SIEMPRE identificar
  await this.executeIdentify(); // Esto ya envía hasAcceptedPrivacyPolicy

  // DESPUÉS verificar si necesitamos mostrar banner
  if (this.consentManager.shouldWaitForConsent()) {
    this.showConsentBanner(); // Nuevo método
    return;
  }

  // Si tiene consentimiento, activar tracking
  if (this.consentManager.isGranted()) {
    localStorage.setItem("pixelEndpoint", this.endpoint);
    localStorage.setItem("guidersApiKey", this.apiKey);
    this.startTracking();
  }
}
```

**Ventajas:**
- ✅ Sigue exactamente la guía oficial
- ✅ Identifica a TODOS los visitantes (con y sin consentimiento)
- ✅ Permite métricas de rechazo
- ✅ Permite remarketing

**Desventajas:**
- ⚠️ Identifica usuarios SIN consentimiento (genera fingerprint sin permiso)
- ⚠️ Podría violar GDPR si el fingerprint se considera dato personal
- ⚠️ Cambia el comportamiento actual

---

### Opción B: Híbrido (Recomendado)

**Identificar solo después del primer consentimiento, pero sincronizar correctamente:**

```typescript
public async init(): Promise<void> {
  // Verificar si se debe esperar el consentimiento
  if (this.consentManager.shouldWaitForConsent()) {
    console.log('[TrackingPixelSDK] 🔐 Esperando consentimiento...');
    this.initChatUIOnly();
    return;
  }

  // Si hay consentimiento (granted o denied), proceder
  const consentState = this.consentManager.getState();
  const hasAcceptedPrivacyPolicy = consentState.status === 'granted';

  // ✅ AHORA SÍ escribir en localStorage (solo si granted)
  if (hasAcceptedPrivacyPolicy) {
    localStorage.setItem("pixelEndpoint", this.endpoint);
    localStorage.setItem("guidersApiKey", this.apiKey);
  }

  // Identificar (envía hasAcceptedPrivacyPolicy correcto)
  await this.executeIdentify();

  // NO llamar a ConsentBackendService.grantConsents aquí
  // El backend ya registró el consentimiento en identify
  // Solo sincronizar si hay cambios posteriores
}

// Modificar grantConsent para NO duplicar
public grantConsent(): void {
  this.consentManager.grantConsent();

  // Re-identificar con el nuevo estado
  this.init().catch(error => {
    console.error('[TrackingPixelSDK] ❌ Error reiniciando SDK:', error);
  });

  // NO llamar a grantConsents aquí, identify ya lo hace
}
```

**Ventajas:**
- ✅ Más conforme con GDPR (no identifica sin consentimiento)
- ✅ Evita duplicación de consentimientos
- ✅ Sigue el espíritu de la guía
- ✅ Mantiene el comportamiento actual

**Desventajas:**
- ⚠️ No identifica a usuarios que rechazan (perdemos esa métrica)
- ⚠️ Se desvía ligeramente de la guía oficial

---

### Opción C: Identificación Anónima Inicial

**Compromiso entre A y B:**

```typescript
public async init(): Promise<void> {
  // 1. SIEMPRE identificar, pero de forma anónima si no hay consentimiento
  const consentState = this.consentManager.getState();
  const hasAcceptedPrivacyPolicy = consentState.status === 'granted';

  if (!hasAcceptedPrivacyPolicy) {
    // Identificación anónima (sin fingerprint, sin tracking)
    await this.identifyAnonymously();

    // Mostrar banner
    if (this.consentManager.shouldWaitForConsent()) {
      this.showConsentBanner();
      return;
    }
  } else {
    // Identificación completa con tracking
    localStorage.setItem("pixelEndpoint", this.endpoint);
    localStorage.setItem("guidersApiKey", this.apiKey);
    await this.executeIdentify();
  }
}

private async identifyAnonymously(): Promise<void> {
  // Identificar con datos mínimos (sin fingerprint)
  await this.identitySignal.identify(
    'anonymous', // Sin fingerprint real
    this.apiKey
  );
}
```

**Ventajas:**
- ✅ Identifica a todos los visitantes
- ✅ No genera fingerprint sin consentimiento
- ✅ Permite métricas de rechazo
- ✅ Conforme con GDPR

**Desventajas:**
- ⚠️ Más complejo
- ⚠️ Requiere cambios en el backend para manejar visitantes anónimos

---

## 🔧 CORRECCIONES NECESARIAS

### 1. Eliminar Duplicación de Registro de Consentimientos

**Problema:** Registramos dos veces el consentimiento:
1. En `identify` (automático)
2. En `grantConsent` → `ConsentBackendService.grantConsents`

**Solución:**

```typescript
// tracking-pixel-SDK.ts - Modificar onConsentChange
onConsentChange: (state) => {
  console.log('[TrackingPixelSDK] 🔐 Estado de consentimiento cambiado:', state);

  if (state.status === 'granted') {
    console.log('[TrackingPixelSDK] ✅ Consentimiento otorgado - habilitando tracking');

    // ❌ ELIMINAR ESTO:
    // const visitorId = this.getVisitorId();
    // if (visitorId && state.preferences) {
    //   this.consentBackendService.grantConsents(visitorId, state.preferences)...
    // }

    // ✅ SOLO re-identificar (identify registra automáticamente)
    this.init();
  }

  if (state.status === 'denied') {
    console.log('[TrackingPixelSDK] ❌ Consentimiento denegado');
    this.stopTrackingActivities();
  }
}
```

**Razón:** El endpoint `/api/visitors/identify` ya registra el consentimiento automáticamente cuando `hasAcceptedPrivacyPolicy: true`.

---

### 2. Usar ConsentBackendService Solo Para Operaciones Específicas

**ConsentBackendService debería usarse para:**
- ✅ Revocar consentimientos: `revokeConsent()`
- ✅ Renovar consentimientos: `renewConsent()`
- ✅ Consultar estado: `getConsentHistory()`
- ✅ Exportar datos: `exportConsentData()`
- ✅ Eliminar datos: `deleteConsentData()`

**NO debería usarse para:**
- ❌ Registrar consentimiento inicial (lo hace identify)
- ❌ Actualizar consentimiento (re-identificar es suficiente)

---

### 3. Clarificar Flujo en Documentación

**Actualizar `CONSENT_IDENTIFY_INTEGRATION.md` con:**

```markdown
## Flujo Correcto

1. Usuario visita sitio
2. SDK verifica localStorage:
   - Si `pending` → Muestra banner, NO identifica
   - Si `granted` → Identifica con hasAcceptedPrivacyPolicy: true
   - Si `denied` → Identifica con hasAcceptedPrivacyPolicy: false

3. Usuario acepta en banner:
   - ConsentManager.grantConsent()
   - SDK llama a init() nuevamente
   - init() → executeIdentify() con hasAcceptedPrivacyPolicy: true
   - Backend registra consentimiento automáticamente

4. Backend recibe identify:
   - Crea/actualiza visitante
   - Si hasAcceptedPrivacyPolicy: true → Registra consentimiento de privacy_policy
   - Retorna visitorId y sessionToken

5. ConsentBackendService se usa SOLO para:
   - Revocar consentimientos
   - Renovar consentimientos
   - Consultar historial
   - Derechos GDPR (export/delete)
```

---

## 📋 CHECKLIST DE CORRECCIONES

```
Críticas:
[✅] Eliminar llamada duplicada a grantConsents en onConsentChange
[✅] Eliminar llamada duplicada a grantConsents en grantConsent()
[✅] Eliminar llamada duplicada a grantConsents en grantConsentWithPreferences()
[⏳] Rebuild del SDK con las correcciones
[⏳] Testing del flujo corregido
[ ] Actualizar documentación del flujo correcto
[ ] Verificar que backend maneja hasAcceptedPrivacyPolicy: false
[ ] Verificar que backend no duplica consentimientos

Importantes:
[✅] Decidir: ¿Identificar sin consentimiento o solo después? → Decidido: Opción B (solo después)
[✅] Aclarar cuándo usar ConsentBackendService vs identify → Aclarado en comentarios del código
[ ] Documentar endpoints /api/consents/* vs /api/visitors/identify

Opcionales:
[ ] Implementar identificación anónima (Opción C)
[ ] Añadir métricas de rechazo de consentimiento
[ ] Implementar remarketing a usuarios sin consentimiento
```

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar Opción B (Híbrido)** con estas correcciones:

1. ✅ Mantener el flujo actual (no identificar sin consentimiento) - GDPR compliant
2. ✅ Eliminar duplicación: `identify` registra consentimiento, NO `grantConsents`
3. ✅ Usar `ConsentBackendService` solo para operaciones específicas (revoke, renew, export, delete)
4. ✅ Actualizar documentación para clarificar el flujo

**Razón:** Es el mejor balance entre:
- Cumplimiento estricto de GDPR
- Evitar duplicación
- Simplicidad de implementación
- Mantenimiento del comportamiento actual

---

## 📞 Próximos Pasos

1. **Verificar con backend:**
   - ¿`/api/visitors/identify` registra automáticamente privacy_policy cuando hasAcceptedPrivacyPolicy: true?
   - ¿Qué hace si se llama a `/api/consents/grant` para un consentimiento que ya existe?
   - ¿Acepta hasAcceptedPrivacyPolicy: false o espera que no se identifique?

2. **Implementar correcciones:**
   - Eliminar duplicación en `onConsentChange`
   - Actualizar documentación
   - Añadir tests

3. **Testing:**
   - Verificar que no hay consentimientos duplicados
   - Verificar flujo completo
   - Verificar logs

---

## ✅ ESTADO DE IMPLEMENTACIÓN - FLUJO AUTOMÁTICO CONFIRMADO

**Backend Implementa Registro Automático:**

Según la guía oficial del backend (`CONSENT_INTEGRATION_GUIDE.md`), cuando el frontend llama a `/api/visitors/identify` con `hasAcceptedPrivacyPolicy: true`, el backend **automáticamente**:

1. ✅ Registra el visitante en el contexto `visitors-v2`
2. ✅ **Registra el consentimiento `privacy_policy`** en el contexto `consent`
3. ✅ Crea un log de auditoría en `consent_audit_logs`
4. ✅ Almacena en MongoDB: colecciones `visitor_consents` y `consent_audit_logs`

**NO es necesario** hacer una llamada adicional a `/api/consents/grant` desde el SDK.

---

**Flujo Correcto Implementado:**

```
1. Usuario acepta consentimiento en banner
   ↓
2. ConsentManager.grantConsent() → Guarda en localStorage
   {
     status: "granted",
     preferences: { analytics: true, functional: true, personalization: true }
   }
   ↓
3. SDK.init() verifica consentimiento → isGranted() = true
   ↓
4. executeIdentify() → POST /api/visitors/identify
   Payload: {
     fingerprint: "...",
     domain: "...",
     apiKey: "...",
     hasAcceptedPrivacyPolicy: true,     // ✅ TRUE
     consentVersion: "1.2.2-alpha.1"     // ✅ Versión del SDK
   }
   ↓
5. Backend ejecuta automáticamente:
   - IdentifyVisitorCommandHandler.execute()
   - visitor.acceptPrivacyPolicy(consentVersion)
   - CommandBus.execute(RecordConsentCommand) ← AUTOMÁTICO
   - RecordConsentCommandHandler.execute()
   - MongoDB: Guarda en visitor_consents
   - EventBus: Despacha ConsentGrantedEvent
   - LogConsentGrantedEventHandler: Guarda en consent_audit_logs
   ↓
6. ✅ Consentimiento registrado automáticamente en backend
   ↓
7. ❌ NO llamar a ConsentBackendService.grantConsents()
   (Evita duplicación y errores)
```

---

**Correcciones Implementadas:**

1. ✅ **Eliminada duplicación en onConsentChange** (línea 222-224)
   - NO llama a `ConsentBackendService.grantConsents()`
   - Comentario: "El endpoint /api/visitors/identify ya registra automáticamente"

2. ✅ **Eliminada duplicación en grantConsent()** (línea 2074-2076)
   - NO llama a `ConsentBackendService.grantConsents()`
   - Comentario: "NO es necesario llamar a grantConsents() para evitar duplicación"

3. ✅ **Eliminada duplicación en grantConsentWithPreferences()** (línea 2097-2099)
   - NO llama a `ConsentBackendService.grantConsents()`
   - Comentario: "NO es necesario llamar a grantConsents() para evitar duplicación"

4. ✅ **Header x-guiders-sid añadido** en todas las peticiones autenticadas
   - ConsentBackendService.makeRequest() incluye `x-guiders-sid`
   - VisitorsV2Service.heartbeat() incluye `x-guiders-sid`
   - VisitorsV2Service.endSession() incluye `x-guiders-sid`

---

**ConsentBackendService ahora se usa SOLO para:**

- ✅ `revokeAllConsents()` - Revocar consentimientos del visitante
- ✅ `renewConsent()` - Renovar consentimientos expirados
- ✅ `getConsentHistory()` - Consultar historial de consentimientos
- ✅ `getAuditLogs()` - Consultar audit logs
- ✅ `exportConsentData()` - Derecho de acceso (Art. 15 GDPR)
- ✅ `deleteConsentData()` - Derecho de supresión (Art. 17 GDPR)
- ✅ `syncWithBackend()` - Sincronizar estado local con backend

**NO se usa para:**

- ❌ `grantConsents()` - Ya NO se llama (identify lo hace automáticamente)

---

**Backend Handler Responsable:**

```typescript
// src/context/visitors-v2/application/commands/identify-visitor.command-handler.ts

async execute(command: IdentifyVisitorCommand): Promise<IdentifyVisitorResponseDto> {
  // 1. Validar hasAcceptedPrivacyPolicy
  if (!command.hasAcceptedPrivacyPolicy) {
    throw new Error('El visitante debe aceptar la política de privacidad');
  }

  // 2. Crear/actualizar visitante
  visitor.acceptPrivacyPolicy(command.consentVersion || 'v1.0');

  // 3. ✅ REGISTRO AUTOMÁTICO DE CONSENTIMIENTO
  const recordConsentCommand = new RecordConsentCommand(
    visitor.getId().value,           // visitorId
    'privacy_policy',                // consentType
    command.consentVersion,          // version desde el SDK
    command.ipAddress,               // IP del request
    command.userAgent,               // User-Agent
    { fingerprint, domain, currentUrl }
  );

  await this.commandBus.execute(recordConsentCommand);
  this.logger.log(`✅ Consentimiento registrado para visitante: ${visitor.getId().value}`);
}
```

---

**Verificación del Registro Automático:**

```bash
# 1. Llamar a identify con hasAcceptedPrivacyPolicy: true
curl -X POST http://localhost:3000/api/visitors/identify \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "1039590477",
    "domain": "127.0.0.1",
    "apiKey": "12ca17b49af...",
    "hasAcceptedPrivacyPolicy": true,
    "consentVersion": "1.2.2-alpha.1"
  }'

# 2. Consultar consentimientos (debe devolver 1 registro)
curl -X GET http://localhost:3000/api/consents/visitors/{visitorId} \
  -H "Cookie: sid=..." \
  -H "x-guiders-sid: {sessionId}"

# Respuesta esperada:
{
  "consents": [
    {
      "visitorId": "...",
      "consentType": "privacy_policy",
      "status": "granted",
      "version": "1.2.2-alpha.1",
      "grantedAt": "2024-10-10T...",
      ...
    }
  ],
  "total": 1  // ✅ Ya NO debe ser 0
}
```

---

**Troubleshooting: Si `total: 0`**

Si `GET /api/consents/visitors/:id` devuelve `{"consents": [], "total": 0}`, verificar:

1. ❌ **ConsentModule NO importado en VisitorsV2Module**
   ```typescript
   // src/context/visitors-v2/visitors-v2.module.ts
   @Module({
     imports: [
       ConsentModule, // ← DEBE ESTAR AQUÍ
     ],
   })
   ```

2. ❌ **CommandBus no encuentra RecordConsentCommandHandler**
   - Revisar logs del backend: `npm run start:dev`
   - Buscar: "Error al registrar consentimiento"

3. ❌ **hasAcceptedPrivacyPolicy es false**
   - El SDK debe enviar `true` cuando el usuario acepta

4. ❌ **Cache del navegador**
   - Limpiar localStorage: `localStorage.clear()`
   - Hard refresh: Cmd+Shift+R (Mac) o Ctrl+Shift+F5 (Windows)

---

**Fecha:** Octubre 2024
**Versión analizada:** 1.2.2-alpha.1
**Estado:** ⚠️ FLUJO MANUAL IMPLEMENTADO - Backend automático NO funcional

---

## 🔄 ACTUALIZACIÓN: Flujo Manual Implementado

**Problema identificado**: El sistema automático del backend descrito en la guía NO está funcionando en producción. El endpoint `/api/visitors/identify` NO registra automáticamente el consentimiento.

**Solución**: Hemos restaurado el flujo **manual** con llamadas explícitas a `POST /api/consents/grant`.

### Flujo Manual Implementado:

```
1. Usuario acepta consentimiento
   ↓
2. ConsentManager.grantConsent() → localStorage
   ↓
3. onConsentChange callback se dispara
   ↓
4. SDK llama a ConsentBackendService.grantConsents()
   ↓
5. POST /api/consents/grant (manual)
   {
     visitorId: "...",
     type: "privacy_policy" | "analytics" | "marketing",
     metadata: { source: "sdk", category: "..." }
   }
   ↓
6. Backend registra en MongoDB (visitor_consents)
   ↓
7. SDK llama a init() → identify con hasAcceptedPrivacyPolicy: true
```

### Llamadas restauradas:

1. ✅ **onConsentChange** (línea 222-233)
   ```typescript
   this.consentBackendService.grantConsents(visitorId, state.preferences)
   ```

2. ✅ **grantConsent()** (línea 2092-2099)
   ```typescript
   this.consentBackendService.grantConsents(visitorId, {
     analytics: true,
     functional: true,
     personalization: true
   })
   ```

3. ✅ **grantConsentWithPreferences()** (línea 2124-2131)
   ```typescript
   this.consentBackendService.grantConsents(visitorId, preferences)
   ```

### Headers incluidos:

✅ `x-guiders-sid` en todas las peticiones POST /api/consents/grant
✅ `credentials: 'include'` para cookies de sesión

### Verificación:

```bash
# Después de aceptar consentimiento, verificar:
GET http://localhost:3000/api/consents/visitors/{visitorId}

# Debe devolver:
{
  "consents": [
    {
      "type": "privacy_policy",
      "status": "granted",
      ...
    },
    {
      "type": "analytics",
      "status": "granted",
      ...
    },
    {
      "type": "marketing",
      "status": "granted",
      ...
    }
  ],
  "total": 3  // ✅ Ya NO debe ser 0
}
```
