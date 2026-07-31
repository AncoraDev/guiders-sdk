# 🚀 Cambios Publicados - Guiders SDK

**Fecha:** 14 de Febrero de 2026  
**Versión:** 1.6.0 (Build con correcciones TTL + V1 cleanup)

---

## ✅ Cambios Desplegados en WordPress Docker

### 📦 Archivos Actualizados

| Archivo | Tamaño | Estado |
|---------|--------|--------|
| `guiders-sdk.js` | 495 KB | ✅ Desplegado |
| `test-v1-cleanup.html` | 11 KB | ✅ Nuevo |
| `test-ttl-emergency.html` | 13 KB | ✅ Nuevo |
| `debug-ttl.html` | 13 KB | ✅ Nuevo |
| `force-reload.html` | Nuevo | ✅ Nuevo |

### 🔧 Correcciones Implementadas

1. **TTL con Migración Automática**: Eventos sin `__queuedAt` reciben timestamp actual
2. **Limpieza de Campos V1**: EventAggregator ya no genera `pageUrl` ni `pagePath`
3. **Eliminación de Eventos Inválidos**: TrackingV2Service retorna `success: true` para permitir dequeue
4. **Límite de Cola Forzado**: Si excede 1000 después de pruning, se eliminan los más antiguos

---

## 🧪 URLs de Verificación

### 1️⃣ Limpiar Cache (EJECUTAR PRIMERO)
```
http://localhost:8090/wp-content/plugins/guiders-wp-plugin/force-reload.html
```
**Acción:** Clic en "LIMPIAR TODO Y RECARGAR" para forzar carga del nuevo SDK

---

### 2️⃣ Test de Limpieza V1 (RECOMENDADO)
```
http://localhost:8090/wp-content/plugins/guiders-wp-plugin/test-v1-cleanup.html
```
**Qué verifica:**
- ✅ Eventos con `pageUrl` y `pagePath` se eliminan
- ✅ No quedan eventos V1 en la cola
- ✅ El backend no recibe eventos inválidos

**Pasos:**
1. Abrir URL
2. Clic en "▶️ EJECUTAR TEST"
3. Esperar 3-5 segundos
4. Verificar resultado: "✅ TEST EXITOSO"

---

### 3️⃣ Test de Eventos Legacy sin __queuedAt
```
http://localhost:8090/wp-content/plugins/guiders-wp-plugin/test-ttl-emergency.html
```
**Qué verifica:**
- ✅ Eventos sin `__queuedAt` reciben timestamp
- ✅ Cola se reduce a máximo 1000 eventos
- ✅ TTL funciona correctamente

**Pasos:**
1. Abrir URL
2. Clic en "▶️ EJECUTAR TEST COMPLETO"
3. Esperar 6 segundos (auto-recarga)
4. Verificar resultado: "✅ TEST EXITOSO"

---

### 4️⃣ Debug General
```
http://localhost:8090/wp-content/plugins/guiders-wp-plugin/debug-ttl.html
```
**Funciones:**
- 📊 Ver estadísticas de cola en tiempo real
- 🔍 Analizar eventos (con/sin timestamps, expirados)
- 🧹 Ejecutar pruning manual
- ⏰ Añadir eventos de prueba (antiguos/recientes)

---

## 🔍 Verificación Rápida en Consola

### Verificar versión del SDK
```javascript
// Verificar que tiene los cambios nuevos
fetch('/wp-content/plugins/guiders-wp-plugin/assets/js/guiders-sdk.js')
  .then(r => r.text())
  .then(code => {
    const checks = {
      'V1 cleanup': code.includes('All events were invalid and discarded'),
      'TTL migration': code.includes('eventos legacy migrados'),
      'Force cleanup': code.includes('Cola excede límite después de pruning')
    };
    console.table(checks);
  });
```

### Verificar estado de la cola
```javascript
const sdk = window.guiders?.trackingPixelSDK;
if (sdk) {
    const stats = sdk.eventQueueManager.getStats();
    console.log('📊 Estado de la Cola:');
    console.table({
        'Eventos': stats.size,
        'Límite': stats.maxSize,
        'Uso %': stats.utilizationPercent.toFixed(1) + '%',
        'TTL (horas)': stats.ttlHours,
        'Más antiguo (horas)': stats.oldestEventAgeHours || 'N/A'
    });
} else {
    console.error('❌ SDK no encontrado');
}
```

### Verificar que no hay eventos V1
```javascript
const stored = JSON.parse(localStorage.getItem('guiders_tracking_v2_queue') || '[]');
const v1Events = stored.filter(e => e.pageUrl || e.pagePath);
console.log(v1Events.length === 0 
    ? '✅ No hay eventos V1 en la cola' 
    : `❌ ${v1Events.length} eventos V1 encontrados`);
```

---

## 📊 Resultados Esperados

### ✅ Test V1 Cleanup
```
✅ TEST EXITOSO: Todos los eventos V1 fueron eliminados
   - Cola vacía: 0 eventos
   - Eventos V1 restantes: 0
   - Los eventos con pageUrl/pagePath fueron rechazados correctamente
```

### ✅ Test TTL Emergency
```
✅ PASS: Cola reducida a ≤1000 eventos
✅ PASS: Todos los eventos tienen __queuedAt (migración exitosa)
🎉 TEST EXITOSO: El SDK está limpiando eventos correctamente
```

---

## 🐛 Si Algo Falla

### Problema: "SDK no detectado"
**Solución:**
1. Abrir `force-reload.html`
2. Limpiar localStorage
3. Recargar página
4. Verificar que `window.guiders` existe en consola

### Problema: "Eventos V1 permanecen en cola"
**Diagnóstico:**
```javascript
// Ver eventos V1
const stored = JSON.parse(localStorage.getItem('guiders_tracking_v2_queue') || '[]');
const v1 = stored.filter(e => e.pageUrl || e.pagePath);
console.log('Eventos V1:', v1);

// Forzar limpieza
window.guiders.trackingPixelSDK.eventQueueManager.clear();
```

### Problema: "Cola excede 1000 eventos"
**Diagnóstico:**
```javascript
const sdk = window.guiders.trackingPixelSDK;
const size = sdk.eventQueueManager.size();
console.log(`Cola actual: ${size} eventos`);

// Forzar pruning
sdk.eventQueueManager.pruneExpiredEvents();
console.log(`Cola después de pruning: ${sdk.eventQueueManager.size()}`);
```

---

## 🎯 Orden de Ejecución Recomendado

1. **Limpiar cache** → `force-reload.html`
2. **Verificar instalación** → Consola: `window.guiders?.trackingPixelSDK`
3. **Test V1 cleanup** → `test-v1-cleanup.html`
4. **Test TTL emergency** → `test-ttl-emergency.html`
5. **Monitorear en producción** → `debug-ttl.html`

---

## 📝 Notas Importantes

- Los cambios se aplican **inmediatamente** gracias al bind mount de Docker
- **NO es necesario reiniciar el contenedor**
- El navegador puede cachear el JS, usa `force-reload.html` para limpiar
- Los eventos antiguos en producción serán migrados automáticamente en la próxima carga

---

## ✅ Checklist Final

- [x] SDK compilado con correcciones
- [x] Archivos copiados a `wordpress-plugin/guiders-wp-plugin/`
- [x] Verificado en contenedor Docker (archivos presentes)
- [x] Verificado acceso HTTP (200 OK)
- [x] Código nuevo presente en SDK (`grep` confirmado)
- [x] Tests HTML creados y desplegados
- [x] Documentación actualizada

---

**¡Todo listo para testing!** 🎉

Abre las URLs de arriba y ejecuta los tests para verificar que las correcciones funcionan.
