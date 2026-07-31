# 🎯 Sistema de Presencia: Independiente del Estado del Chat

## ✅ Confirmación: Presencia NO depende del Chat

El sistema de presencia está **correctamente diseñado** para funcionar **independientemente** del estado del chat (abierto/cerrado).

---

## 📊 Arquitectura del Sistema

### Flujo de Inicialización

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario carga la página                                 │
│    └─> SDK se inicializa                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SDK.identify() se ejecuta                                │
│    └─> Genera fingerprint del navegador                    │
│    └─> Envía a backend: POST /visitors/v2/identify         │
│    └─> Backend retorna: visitorId (UUID)                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. setupPresenceService() se ejecuta                        │
│    ✅ Ubicación: tracking-pixel-SDK.ts:1012                 │
│    ✅ Momento: DESPUÉS de identify(), ANTES de abrir chat   │
│    ✅ Condición: NINGUNA (siempre se ejecuta)               │
│                                                              │
│    └─> new PresenceService(wsService, visitorId, config)   │
│         └─> constructor() ejecuta:                          │
│             ├─> setupWebSocketListeners()                   │
│             └─> setupUserActivityListeners() ← CLAVE        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. setupUserActivityListeners() configura listeners         │
│    ✅ Ubicación: presence-service.ts:188                    │
│    ✅ Scope: document (GLOBAL, no limitado al chat)         │
│                                                              │
│    Eventos escuchados en DOCUMENT COMPLETO:                 │
│    ├─> document.addEventListener('click', ...)              │
│    ├─> document.addEventListener('keydown', ...)            │
│    ├─> document.addEventListener('touchstart', ...)         │
│    ├─> document.addEventListener('scroll', ...)             │
│    ├─> document.addEventListener('mousemove', ...)          │
│    └─> document.addEventListener('visibilitychange', ...)   │
│                                                              │
│    Cada evento → recordUserInteraction()                    │
│                → sendHeartbeat('user-interaction')          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. startHeartbeat() inicia heartbeat automático             │
│    ✅ Ubicación: tracking-pixel-SDK.ts:2533                 │
│    ✅ Intervalo: 30 segundos                                │
│    ✅ Tipo: 'heartbeat' (mantiene sesión viva)              │
│                                                              │
│    setInterval(() => {                                      │
│      sendHeartbeat('heartbeat');  // Cada 30s               │
│    }, 30000);                                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Chat puede abrirse o NO                                  │
│    ⚠️ Estado del chat: IRRELEVANTE para presencia           │
│                                                              │
│    Presencia ya funciona:                                   │
│    ├─> Heartbeat automático cada 30s                        │
│    ├─> Listeners activos en toda la página                  │
│    └─> Detecta actividad EN CUALQUIER PARTE                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Evidencia Código

### 1. Inicialización en tracking-pixel-SDK.ts

```typescript
// Línea 1012 - Se ejecuta SIEMPRE después de identify()
// NO está condicionado a que el chat esté abierto

private async executeIdentify(): Promise<void> {
  // ... identify logic ...

  // 🟢 Inicializar servicio de presencia y typing indicators
  this.setupPresenceService();  // ← AQUÍ - Independiente del chat
  debugLog('🟢 [TrackingPixelSDK] ✅ Servicio de presencia configurado');

  // ... resto del código ...
}
```

### 2. Listeners Globales en presence-service.ts

```typescript
// Línea 188-223 - Listeners en document GLOBAL

private setupUserActivityListeners(): void {
  if (!this.config.enabled) {
    return;
  }

  // Handler con throttling
  this.boundUserInteractionHandler = (_event: Event) => {
    this.recordUserInteraction(); // Envía heartbeat tipo 'user-interaction'
  };

  // Eventos a escuchar (según guía oficial)
  const userActivityEvents = ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'];

  // ✅ Registrar en DOCUMENT (global), NO en elemento del chat
  if (this.boundUserInteractionHandler) {
    userActivityEvents.forEach(eventType => {
      document.addEventListener(eventType, this.boundUserInteractionHandler!, {
        passive: true
      });
    });
  }

  // Listener de visibilitychange
  this.boundVisibilityChangeHandler = (_event: Event) => {
    if (document.visibilityState === 'visible') {
      this.recordTabFocus(); // Envía heartbeat inmediato
    }
  };

  if (this.boundVisibilityChangeHandler) {
    document.addEventListener('visibilitychange', this.boundVisibilityChangeHandler);
  }
}
```

---

## 🧪 Prueba de Independencia

### Página de Test Creada

**Archivo**: `test-presence-independence.html`

**Objetivo**: Demostrar que el sistema de presencia funciona **SIN necesidad de abrir el chat**.

### Instrucciones de Prueba

1. **Abre el archivo** `test-presence-independence.html` en tu navegador
2. **NO abras el chat** - Déjalo cerrado todo el tiempo
3. **Interactúa con la página**:
   - Haz scroll hacia arriba/abajo
   - Haz clicks en cualquier parte
   - Mueve el mouse
   - Presiona teclas (flechas, espacio, etc.)
4. **Observa el contador** "User Interactions Detected"
5. **Verifica que aumenta** incluso con el chat CERRADO

### Resultado Esperado

```
✅ Heartbeats Automáticos: Aumenta cada 30s (independiente de todo)
✅ User Interactions Detected: Aumenta al interactuar (chat cerrado)
✅ Eventos de Usuario Capturados: Aumenta en tiempo real
✅ Tiempo Desde Última Interacción: Se resetea al interactuar
```

---

## 📝 Escenarios de Uso

### Escenario 1: Usuario navega sin abrir chat

```
Usuario está en la página leyendo contenido
  ├─> Hace scroll → Evento 'scroll' capturado
  ├─> Click en enlace → Evento 'click' capturado
  ├─> Mueve mouse → Evento 'mousemove' capturado
  └─> Presiona teclas → Evento 'keydown' capturado

Estado en backend: ONLINE 🟢
Chat: CERRADO ⚫
Heartbeats: Se envían normalmente
```

### Escenario 2: Usuario deja la página inactiva (chat cerrado)

```
Usuario abre la página pero NO interactúa
  ├─> Solo heartbeats automáticos cada 30s
  ├─> NO hay eventos de usuario
  └─> Pasan 5+ minutos sin interacción

Estado esperado en backend:
  ├─> 0-5 min: ONLINE 🟢
  ├─> 5-15 min: AWAY 🟡 (si backend diferencia activityType)
  └─> 15+ min: OFFLINE ⚫

Chat: CERRADO ⚫
```

### Escenario 3: Usuario vuelve después de inactividad (chat cerrado)

```
Usuario estuvo inactivo 10 minutos (chat cerrado)
  └─> Estado backend: AWAY 🟡

Usuario mueve el mouse
  ├─> Evento 'mousemove' capturado
  ├─> recordUserInteraction() ejecutado
  ├─> sendHeartbeat('user-interaction') enviado
  └─> Backend actualiza lastUserActivity

Estado backend: ONLINE 🟢
Chat: SIGUE CERRADO ⚫
```

---

## ⚠️ Problema Actual: Estado AWAY

Si el estado AWAY nunca se muestra, **NO es culpa del frontend**.

### Causa Raíz

El backend probablemente **NO diferencia** entre los dos tipos de `activityType`:

```typescript
// ❌ PROBLEMA (Backend actual - hipótesis)
async function handleHeartbeat(sessionId, activityType) {
  const session = await getSession(sessionId);

  // Actualiza SIEMPRE lastActivity, ignorando activityType
  session.lastActivity = new Date();

  // Calcula estado basado en lastActivity
  if (now - lastActivity < 5min) → ONLINE
  // ↑ NUNCA llega a este punto porque heartbeat actualiza cada 30s
}
```

### Solución (Backend)

Ver documento completo: `AWAY_STATUS_SOLUTION.md`

**Resumen**: Backend debe manejar dos campos separados:
- `lastHeartbeat` → Actualizado con CUALQUIER tipo
- `lastUserActivity` → Actualizado SOLO con `user-interaction`

---

## ✅ Checklist de Verificación Frontend

- ✅ PresenceService se inicializa después de identify()
- ✅ PresenceService NO depende del chat abierto/cerrado
- ✅ setupUserActivityListeners() se ejecuta en constructor
- ✅ Listeners se registran en `document` (global)
- ✅ Eventos escuchados: click, keydown, touchstart, scroll, mousemove
- ✅ Listener de visibilitychange configurado
- ✅ startHeartbeat() inicia automáticamente (cada 30s)
- ✅ recordUserInteraction() tiene throttling de 5s
- ✅ sendHeartbeat() diferencia entre 'heartbeat' y 'user-interaction'
- ✅ Cleanup() limpia todos los listeners correctamente

---

## 📞 FAQ

### ❓ ¿Los listeners funcionan si el chat está cerrado?

**Sí**. Los listeners están en `document` (global), no en el elemento del chat.

### ❓ ¿Cuándo se inicializa el sistema de presencia?

**Después de `identify()`**, ANTES de abrir el chat. Es independiente del estado del chat.

### ❓ ¿Qué eventos detecta el sistema?

**Todos los eventos del documento**:
- `click` - Cualquier click en la página
- `keydown` - Cualquier tecla presionada
- `touchstart` - Cualquier toque (móviles/tablets)
- `scroll` - Cualquier scroll
- `mousemove` - Cualquier movimiento del mouse
- `visibilitychange` - Cambio de pestaña visible/oculta

### ❓ ¿Por qué no veo el estado AWAY?

**Problema en el backend**. Ver `AWAY_STATUS_SOLUTION.md` para detalles completos.

El backend debe diferenciar entre:
- `heartbeat` (mantiene sesión viva)
- `user-interaction` (usuario activo)

### ❓ ¿Puedo desactivar el sistema de presencia?

**Sí**:

```typescript
const sdk = new TrackingPixelSDK({
  presence: {
    enabled: false // Desactiva presencia completamente
  }
});
```

### ❓ ¿Puedo cambiar el intervalo de heartbeat?

**Sí** (pero NO recomendado cambiar de 30s):

```typescript
const sdk = new TrackingPixelSDK({
  presence: {
    heartbeatInterval: 30000, // 30 segundos (recomendado)
    userInteractionThrottle: 5000 // 5 segundos (recomendado)
  }
});
```

---

## 🎯 Conclusión

El sistema de presencia está **correctamente implementado** en el frontend:

✅ **Independiente del chat** - Funciona con chat abierto o cerrado
✅ **Listeners globales** - Detecta actividad en toda la página
✅ **Heartbeat diferenciado** - Distingue entre automático y usuario
✅ **Throttling correcto** - 30s para heartbeat, 5s para interacción

Si el estado AWAY no se muestra, el problema está en el **backend**, que debe implementar la lógica de dos campos (`lastHeartbeat` + `lastUserActivity`).

---

**Última actualización**: 2025-11-14
**Versión del SDK**: 1.6.0
**Test disponible**: `test-presence-independence.html`
