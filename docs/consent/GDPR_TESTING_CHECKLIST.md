# ✅ Checklist de Testing - Cumplimiento GDPR

## 📋 Pruebas de Cumplimiento Legal

### Test 1: localStorage Solo Después del Consentimiento ✅

**Objetivo:** Verificar que NO se escribe en localStorage antes de obtener consentimiento.

**Pasos:**
1. Abrir DevTools → Application → Local Storage
2. Limpiar todo: `localStorage.clear()`
3. Recargar la página: `location.reload()`
4. **VERIFICAR:** En localStorage solo debe aparecer `guiders_consent_state`
5. **NO DEBE APARECER:** `pixelEndpoint`, `guidersApiKey`, `fingerprint`

**Resultado esperado:**
```javascript
// localStorage inmediatamente después de cargar (SIN consentimiento):
{
  "guiders_consent_state": "{\"status\":\"pending\",\"timestamp\":...}"
}

// NO debe haber:
// ❌ pixelEndpoint
// ❌ guidersApiKey
// ❌ fingerprint
```

**Código de testing:**
```javascript
// Test automático
localStorage.clear();
location.reload();

setTimeout(() => {
  const keys = Object.keys(localStorage);
  console.log('📊 Keys en localStorage:', keys);

  // Verificar
  const hasPixelEndpoint = keys.includes('pixelEndpoint');
  const hasApiKey = keys.includes('guidersApiKey');
  const hasFingerprint = keys.includes('fingerprint');

  if (!hasPixelEndpoint && !hasApiKey && !hasFingerprint) {
    console.log('✅ TEST PASSED: localStorage limpio sin consentimiento');
  } else {
    console.error('❌ TEST FAILED: localStorage contiene datos sin consentimiento');
    console.error('Encontrado:', {hasPixelEndpoint, hasApiKey, hasFingerprint});
  }
}, 2000);
```

**Estado:** ⬜ Pendiente

---

### Test 2: localStorage Después de Aceptar Consentimiento ✅

**Objetivo:** Verificar que SÍ se escribe en localStorage después de aceptar.

**Pasos:**
1. Continuar desde Test 1 (sin consentimiento)
2. Clic en "Aceptar todas" en el banner
3. Esperar 2 segundos
4. **VERIFICAR:** Ahora SÍ deben aparecer todos los datos

**Resultado esperado:**
```javascript
// localStorage DESPUÉS de aceptar consentimiento:
{
  "guiders_consent_state": "{\"status\":\"granted\",...}",
  "pixelEndpoint": "http://localhost:3000/api",
  "guidersApiKey": "12ca17b49af...",
  "fingerprint": "2714824192"
}
```

**Código de testing:**
```javascript
// Aceptar consentimiento
window.guiders.grantConsent();

setTimeout(() => {
  const hasPixelEndpoint = localStorage.getItem('pixelEndpoint') !== null;
  const hasApiKey = localStorage.getItem('guidersApiKey') !== null;
  const hasFingerprint = localStorage.getItem('fingerprint') !== null;

  if (hasPixelEndpoint && hasApiKey && hasFingerprint) {
    console.log('✅ TEST PASSED: localStorage correcto después del consentimiento');
  } else {
    console.error('❌ TEST FAILED: Faltan datos en localStorage');
  }
}, 3000);
```

**Estado:** ⬜ Pendiente

---

### Test 3: Banner Muestra Información Completa ✅

**Objetivo:** Verificar que el banner cumple con Art. 13 GDPR.

**Pasos:**
1. Abrir la demo: `http://localhost:8080/`
2. Limpiar localStorage: `localStorage.clear()` + reload
3. Verificar visualmente el banner

**Debe mostrar:**
- ✅ Responsable del tratamiento
- ✅ Email de contacto
- ✅ Finalidades específicas (chat, análisis, personalización)
- ✅ Derechos del usuario (acceso, supresión, etc.)
- ✅ Enlace a AEPD
- ✅ Plazo de conservación (24 meses)
- ✅ Enlace a política de cookies

**Verificación manual:**
```
[ ] Texto "Responsable: [Tu Empresa]" visible
[ ] Texto "Contacto: privacy@tuempresa.com" visible
[ ] Menciona "Chat en vivo (necesario para el servicio)"
[ ] Menciona "Análisis del sitio (mejorar experiencia)"
[ ] Menciona "Personalización (recordar preferencias)"
[ ] Menciona "Tus derechos: Acceso, rectificación..."
[ ] Link a "www.aepd.es" visible
[ ] Menciona "Conservación: 24 meses"
[ ] Link a "/politica-cookies" visible
```

**Estado:** ⬜ Pendiente

---

### Test 4: Modal de Preferencias Muestra Información Legal ✅

**Objetivo:** Verificar información detallada en el modal.

**Pasos:**
1. Clic en "⚙️ Preferencias" en el banner
2. Verificar información de cada categoría

**Debe mostrar para cada categoría:**
- ✅ Finalidad específica
- ✅ Base legal (Art. GDPR)
- ✅ Datos recopilados
- ✅ Plazo de conservación

**Verificación manual:**
```
Cookies Funcionales:
[ ] Finalidad: "Prestar el servicio de chat..."
[ ] Base legal: "Art. 6.1.b GDPR"
[ ] Datos: "Session ID, Visitor ID..."
[ ] Conservación: "24 meses"

Cookies de Análisis:
[ ] Finalidad: "Analizar el uso del sitio..."
[ ] Base legal: "Art. 6.1.a GDPR (consentimiento)"
[ ] Datos: "Páginas visitadas, clics..."
[ ] Conservación: "24 meses"

Cookies de Personalización:
[ ] Finalidad: "Recordar preferencias..."
[ ] Base legal: "Art. 6.1.a GDPR (consentimiento)"
[ ] Datos: "Idioma preferido, configuración..."
[ ] Conservación: "24 meses"
```

**Estado:** ⬜ Pendiente

---

### Test 5: Política de Cookies Accesible ✅

**Objetivo:** Verificar que la política de cookies existe y es completa.

**Pasos:**
1. Navegar a: `http://localhost:8080/politica-cookies`
2. Verificar secciones

**Debe incluir:**
- ✅ Responsable del tratamiento completo
- ✅ Explicación de qué son las cookies
- ✅ Tabla de cookies técnicas
- ✅ Tabla de cookies de análisis
- ✅ Tabla de cookies de personalización
- ✅ Plazo de conservación
- ✅ Tus derechos (completos)
- ✅ Cómo gestionar cookies
- ✅ Información de la AEPD
- ✅ Transferencias internacionales
- ✅ Seguridad
- ✅ Contacto

**Verificación manual:**
```
[ ] Página carga correctamente
[ ] Sección "Responsable del Tratamiento" presente
[ ] Sección "Tipos de Cookies" presente
[ ] Tablas de cookies presentes
[ ] Sección "Tus Derechos" presente
[ ] Botón "Gestionar Preferencias" funciona
[ ] Enlaces a AEPD funcionan
[ ] Información de contacto presente
```

**Estado:** ⬜ Pendiente

---

### Test 6: Consentimiento Persiste Entre Sesiones ✅

**Objetivo:** Verificar que el consentimiento se recuerda.

**Pasos:**
1. Aceptar consentimiento completo
2. Cerrar pestaña
3. Abrir nueva pestaña en la misma URL
4. **VERIFICAR:** Banner NO debe aparecer

**Código de testing:**
```javascript
// Sesión 1
window.guiders.grantConsent();
console.log('✅ Consentimiento otorgado');

// Cerrar y reabrir navegador

// Sesión 2 (nueva pestaña)
const status = window.guiders.getConsentStatus();
if (status === 'granted') {
  console.log('✅ TEST PASSED: Consentimiento persiste');
} else {
  console.error('❌ TEST FAILED: Consentimiento no persiste');
}
```

**Estado:** ⬜ Pendiente

---

### Test 7: Revocación Funciona Correctamente ✅

**Objetivo:** Verificar que revocar consentimiento limpia datos.

**Pasos:**
1. Tener consentimiento otorgado
2. Ejecutar: `window.guiders.revokeConsent()`
3. **VERIFICAR:** Estado cambia a 'denied'
4. **VERIFICAR:** Tracking se detiene

**Código de testing:**
```javascript
// Otorgar primero
window.guiders.grantConsent();
await new Promise(resolve => setTimeout(resolve, 2000));

// Revocar
window.guiders.revokeConsent();
await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar
const status = window.guiders.getConsentStatus();
const state = window.guiders.getConsentState();

if (status === 'denied' && !state.preferences.analytics) {
  console.log('✅ TEST PASSED: Revocación funciona');
} else {
  console.error('❌ TEST FAILED: Revocación no funciona correctamente');
}
```

**Estado:** ⬜ Pendiente

---

### Test 8: Derechos ARCO Funcionan ✅

**Objetivo:** Verificar implementación de derechos GDPR.

**Test 8a: Exportación de datos**
```javascript
const data = await window.guiders.exportVisitorData();
const parsed = JSON.parse(data);

// Verificar estructura
const hasVisitorId = !!parsed.visitorId;
const hasConsentState = !!parsed.consentState;
const hasLocalStorage = !!parsed.localStorage;
const hasBackendConsents = !!parsed.backendConsents;

if (hasVisitorId && hasConsentState && hasLocalStorage) {
  console.log('✅ TEST PASSED: Exportación completa');
} else {
  console.error('❌ TEST FAILED: Exportación incompleta');
}
```

**Test 8b: Eliminación de datos**
```javascript
await window.guiders.deleteVisitorData();

// Verificar que localStorage está limpio
const keys = Object.keys(localStorage);
const hasData = keys.some(k => k.startsWith('guiders'));

if (!hasData || keys.length === 0) {
  console.log('✅ TEST PASSED: Datos eliminados correctamente');
} else {
  console.error('❌ TEST FAILED: Quedan datos en localStorage');
  console.error('Keys restantes:', keys);
}
```

**Estado:** ⬜ Pendiente

---

### Test 9: Endpoint Identity Incluye Consentimiento ✅

**Objetivo:** Verificar que el endpoint identity envía los campos de consentimiento.

**Pasos:**
1. Abrir DevTools → Network tab
2. Limpiar localStorage y recargar
3. Aceptar consentimiento
4. Buscar request a `/api/visitors/identify`
5. Ver payload

**Resultado esperado:**
```json
{
  "fingerprint": "2714824192",
  "domain": "localhost",
  "apiKey": "12ca17b49af...",
  "hasAcceptedPrivacyPolicy": true,
  "consentVersion": "1.2.2-alpha.1"
}
```

**Verificación:**
```
[ ] Request a "/api/visitors/identify" visible
[ ] Payload incluye "hasAcceptedPrivacyPolicy"
[ ] Payload incluye "consentVersion"
[ ] hasAcceptedPrivacyPolicy es true (después de aceptar)
[ ] consentVersion coincide con versión del SDK
```

**Estado:** ⬜ Pendiente

---

### Test 10: Logs en Consola Son Correctos ✅

**Objetivo:** Verificar que los logs guían al desarrollador.

**Logs esperados sin consentimiento:**
```
[TrackingPixelSDK] 🔐 Esperando consentimiento del usuario antes de inicializar tracking...
[TrackingPixelSDK] 💡 Usar .grantConsent() para habilitar el tracking
```

**Logs esperados después de aceptar:**
```
[TrackingPixelSDK] 🔐 Consentimiento verificado - guardando configuración en localStorage
[VisitorsV2Service] 🔐 Enviando identify con consentimiento: { hasAcceptedPrivacyPolicy: true, consentVersion: "1.2.2-alpha.1" }
[TrackingPixelSDK] 🔄 Consentimiento completo sincronizado con backend
```

**Verificación manual:**
```
[ ] Logs claros y descriptivos
[ ] Emojis ayudan a identificar tipo de mensaje
[ ] No hay errores en consola
[ ] Logs guían al desarrollador
```

**Estado:** ⬜ Pendiente

---

## 📊 Resumen de Tests

| # | Test | Estado | Prioridad |
|---|------|--------|-----------|
| 1 | localStorage solo después del consentimiento | ⬜ | 🔴 Crítico |
| 2 | localStorage después de aceptar | ⬜ | 🔴 Crítico |
| 3 | Banner con información completa | ⬜ | 🔴 Alta |
| 4 | Modal con información legal | ⬜ | 🟡 Media |
| 5 | Política de cookies accesible | ⬜ | 🔴 Alta |
| 6 | Consentimiento persiste | ⬜ | 🟡 Media |
| 7 | Revocación funciona | ⬜ | 🟡 Media |
| 8 | Derechos ARCO funcionan | ⬜ | 🟡 Media |
| 9 | Endpoint identity con consentimiento | ⬜ | 🟡 Media |
| 10 | Logs correctos | ⬜ | 🟢 Baja |

---

## 🚀 Ejecutar Tests

### Método 1: Manual (Recomendado para primera vez)

1. Abrir: `http://localhost:8080/`
2. Abrir DevTools (F12)
3. Seguir los pasos de cada test
4. Marcar ✅ los que pasen

### Método 2: Semi-Automático

Copiar y pegar en la consola:

```javascript
// Script de testing completo
(async function testGDPR() {
  console.log('🧪 Iniciando tests de cumplimiento GDPR...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: localStorage limpio sin consentimiento
  console.log('Test 1: localStorage sin consentimiento');
  localStorage.clear();
  location.reload();

  // Continuar después del reload...
  await new Promise(resolve => setTimeout(resolve, 2000));

  const keys = Object.keys(localStorage);
  const test1 = !keys.includes('pixelEndpoint') &&
                !keys.includes('guidersApiKey') &&
                !keys.includes('fingerprint');

  if (test1) {
    console.log('✅ Test 1 PASSED');
    passed++;
  } else {
    console.error('❌ Test 1 FAILED');
    failed++;
  }

  // Test 2: localStorage después de consentimiento
  console.log('\nTest 2: localStorage después del consentimiento');
  window.guiders.grantConsent();
  await new Promise(resolve => setTimeout(resolve, 3000));

  const test2 = localStorage.getItem('pixelEndpoint') !== null &&
                localStorage.getItem('guidersApiKey') !== null;

  if (test2) {
    console.log('✅ Test 2 PASSED');
    passed++;
  } else {
    console.error('❌ Test 2 FAILED');
    failed++;
  }

  // Resumen
  console.log(`\n📊 Resumen: ${passed} passed, ${failed} failed`);
})();
```

---

## ✅ Criterios de Aprobación

Para considerar el sistema CONFORME con GDPR:

- ✅ Tests 1, 2, 3, 5 deben pasar (CRÍTICOS)
- ✅ Al menos 7/10 tests deben pasar
- ✅ 0 tests críticos fallidos
- ✅ Revisión legal recomendada antes de producción

---

## 📝 Notas

- Los tests deben ejecutarse en entorno local primero
- Revisar con abogado especializado antes de producción
- Documentar resultados de tests para auditorías
- Re-testear después de cada cambio en el código

---

**Fecha de creación:** Octubre 2024
**Versión del SDK:** 1.2.2-alpha.1
**Próxima revisión:** Después de correcciones
