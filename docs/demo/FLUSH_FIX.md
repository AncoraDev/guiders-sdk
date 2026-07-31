# 🔧 Fix: Flush no funciona - SDK Cacheado

## ❌ Problema Identificado

El navegador está usando una **versión cacheada del SDK** que NO incluye las optimizaciones de Tracking V2.

### 🔍 Evidencia

**Logs que DEBERÍAN aparecer pero NO aparecen:**
```
[TrackingPixelSDK] 📊 Tracking V2 habilitado
[EventThrottler] ✅ Initialized
[EventAggregator] ✅ Initialized
[EventQueueManager] ✅ Inicializado
[TrackingV2Service] ✅ Metadata obtenida del backend
```

**Logs que SÍ aparecen (indica SDK antiguo):**
```
[EnhancedDomTrackingManager] 📊 Tracking "view_product"
[VisitorsV2Service] ✅ identify OK
```

Esto confirma que el SDK está funcionando PERO con el código antiguo sin Tracking V2.

## ✅ Solución: Forzar Recarga del SDK

### Paso 1: Agregar cache buster al script tag

Edita `demo/app/partials/header.php` línea 99:

**Antes:**
```html
<script src="/guiders-sdk.js?dev=true" data-api-key="..."></script>
```

**Después:**
```html
<script src="/guiders-sdk.js?dev=true&v=<?php echo time(); ?>" data-api-key="..."></script>
```

El `<?php echo time(); ?>` genera un timestamp único cada vez que se carga la página, forzando al navegador a ignorar el cache.

### Paso 2: Limpiar cache del navegador

**Opción A: Hard Reload (Recomendado)**
- **Chrome/Edge**: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
- **Firefox**: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
- **Safari**: `Cmd + Option + R`

**Opción B: Limpiar manualmente**
1. Abre DevTools (F12)
2. Click derecho en el botón de reload
3. Selecciona **"Empty Cache and Hard Reload"**

**Opción C: Limpiar localStorage también**
```javascript
// En consola del navegador
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Paso 3: Verificar que se cargó la nueva versión

Después de recargar, en la consola deberías ver:

```
[TrackingPixelSDK] 📊 Tracking V2 habilitado {
  batchSize: 500,
  flushInterval: 5000,
  throttling: true,
  aggregation: true,
  bypassConsent: false
}
[EventThrottler] ✅ Initialized: {
  enabled: true,
  rulesCount: 6,
  debug: true
}
[EventAggregator] ✅ Initialized: {
  windowMs: 1000,
  maxBufferSize: 1000
}
[EventAggregator] ⏰ Auto-flush iniciado cada 1000ms
[EventQueueManager] ✅ Inicializado (maxSize: 10000, persist: true)
[TrackingV2Service] ✅ Metadata obtenida del backend: {
  tenantId: "...",
  siteId: "..."
}
```

### Paso 4: Verificar auto-flush

Después de 5 segundos deberías ver:

```
[EventAggregator] 🚀 Flush: original: 25, agregado: 3, reducción: 88.0%
[TrackingPixelSDK] 🔗 3 eventos agregados añadidos a la cola
[TrackingPixelSDK] 📤 Enviando batch de 3 eventos (V2)...
[TrackingV2Service] 📤 Enviando batch de 3 eventos válidos...
[TrackingV2Service] ✅ Batch enviado exitosamente: {
  success: true,
  received: 3,
  processed: 3,
  discarded: 0
}
[EventQueueManager] ➖ 3 eventos eliminados (quedan: 0)
```

## 🧪 Test de Verificación

Ejecuta en consola después de recargar:

```javascript
// 1. Verificar que TrackingV2 está habilitado
console.log('TrackingV2 habilitado:', window.guiders?.trackingPixelSDK?.trackingV2Enabled);
// Debe ser: true

// 2. Verificar que el throttler existe
console.log('Throttler:', !!window.guiders?.trackingPixelSDK?.eventThrottler);
// Debe ser: true

// 3. Verificar que el agregador existe
console.log('Agregador:', !!window.guiders?.trackingPixelSDK?.eventAggregator);
// Debe ser: true

// 4. Verificar que el queue manager existe
console.log('Queue Manager:', !!window.guiders?.trackingPixelSDK?.eventQueueManager);
// Debe ser: true

// 5. Ver tamaño actual de la cola
console.log('Cola:', window.guiders?.trackingPixelSDK?.eventQueueManager?.size());
// Debe retornar un número (0 o más)

// 6. Generar eventos de prueba
for(let i = 0; i < 10; i++) {
  window.guiders.trackingPixelSDK.trackEvent('TEST_FLUSH', { index: i, timestamp: Date.now() });
}

// 7. Verificar que se encolaron
console.log('Cola después de generar eventos:', window.guiders.trackingPixelSDK.eventQueueManager.size());
// Debe ser > 0

// 8. Esperar 6 segundos y verificar que se enviaron
setTimeout(() => {
  console.log('Cola después de flush:', window.guiders.trackingPixelSDK.eventQueueManager.size());
  // Debe ser 0 (eventos enviados)
}, 6000);
```

Si todos estos tests pasan, el problema está resuelto.

## 🐛 Si el problema persiste

### Verificar que el archivo se actualizó correctamente

```bash
# En terminal
cd demo/app
ls -lh guiders-sdk.js
# Debe mostrar fecha/hora reciente

# Ver tamaño del archivo
wc -c guiders-sdk.js
# Debe ser ~413000 bytes (413 KB)
```

### Verificar que el servidor PHP sirve el archivo correcto

```bash
# En terminal
curl http://127.0.0.1:8083/guiders-sdk.js | head -n 5
# Debe mostrar el código del bundle
```

### Verificar logs de red

1. Abre Network tab
2. Filtra por `guiders-sdk.js`
3. Verifica que:
   - Status: `200 OK`
   - Size: `~413 KB`
   - Type: `application/javascript`
   - **NO dice "(from disk cache)" o "(from memory cache)"**

Si dice "from cache", el navegador sigue usando cache. Prueba:
- Abrir en ventana de incógnito
- Usar otro navegador
- Deshabilitar cache en DevTools (Network tab → checkbox "Disable cache")

## 📝 Resumen de Cambios Necesarios

1. ✅ Agregar cache buster en header.php
2. ✅ Hard reload del navegador (Ctrl+Shift+R)
3. ✅ Verificar logs en consola
4. ✅ Ejecutar test de verificación

---

**Última actualización**: 2025-10-23
