# 🔧 Solución: Estado AWAY no se muestra

## 📋 Diagnóstico

**Problema**: Los visitantes nunca aparecen como "AWAY" 🟡, siempre están "ONLINE" 🟢.

**Causa raíz**: El backend probablemente NO está diferenciando entre los dos tipos de `activityType` cuando actualiza el tiempo de actividad del usuario.

### Flujo Actual (Problemático)

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Heartbeat automático cada 30s                               │
│     → POST /visitors/session/heartbeat                          │
│     → { activityType: 'heartbeat' }                             │
│                                                                  │
│  2. User interaction (click, keydown, etc.) - throttle 5s       │
│     → POST /visitors/session/heartbeat                          │
│     → { activityType: 'user-interaction' }                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (ACTUAL - PROBLEMA)                                    │
├─────────────────────────────────────────────────────────────────┤
│  POST /visitors/session/heartbeat                               │
│  {                                                               │
│    // ❌ PROBLEMA: Ignora activityType                          │
│    session.lastActivity = new Date();  // Actualiza SIEMPRE    │
│                                                                  │
│    // Calcula estado                                            │
│    if (now - lastActivity < 5min) → ONLINE                      │
│    else if (now - lastActivity < 15min) → AWAY                  │
│    else → OFFLINE                                               │
│  }                                                               │
│                                                                  │
│  Resultado: Nunca llega a 5 min porque heartbeat actualiza      │
│             lastActivity cada 30s                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Solución 1: Cambiar Backend (RECOMENDADO)

### Backend debe manejar dos campos separados

```typescript
// Modelo de sesión actualizado
interface VisitorSession {
  sessionId: string;

  // ✅ NUEVO: Dos campos separados
  lastHeartbeat: Date;      // Actualizado con CUALQUIER tipo de heartbeat
  lastUserActivity: Date;   // Actualizado SOLO con 'user-interaction'

  connectionStatus: 'online' | 'away' | 'offline';
}
```

### Endpoint: POST /visitors/session/heartbeat

```typescript
async function handleHeartbeat(
  sessionId: string,
  activityType: 'heartbeat' | 'user-interaction'
) {
  const session = await getSession(sessionId);

  // ✅ SIEMPRE actualizar lastHeartbeat (mantiene sesión viva)
  session.lastHeartbeat = new Date();

  // ✅ SOLO actualizar lastUserActivity si es interacción REAL
  if (activityType === 'user-interaction') {
    session.lastUserActivity = new Date();
  }

  // ✅ Calcular estado basado en AMBOS campos
  const now = Date.now();
  const inactivityMs = now - session.lastUserActivity.getTime();
  const heartbeatMs = now - session.lastHeartbeat.getTime();

  if (inactivityMs < 5 * 60 * 1000) {
    // < 5 min desde última interacción → ONLINE
    session.connectionStatus = 'online';

  } else if (heartbeatMs < 15 * 60 * 1000) {
    // >= 5 min inactivo PERO sesión sigue viva → AWAY
    session.connectionStatus = 'away';

  } else {
    // >= 15 min sin heartbeats → OFFLINE
    session.connectionStatus = 'offline';
  }

  await saveSession(session);

  return {
    success: true,
    connectionStatus: session.connectionStatus,
    inactivityMs: inactivityMs,
    heartbeatMs: heartbeatMs
  };
}
```

### Tabla de Estados

#### Timeouts Recomendados (Más Ágiles)

**⚡ RECOMENDACIÓN**: Los timeouts de 5 min y 15 min son muy largos para la mayoría de casos de uso. Se recomienda:

| Condición | lastUserActivity | lastHeartbeat | Estado | Emoji |
|-----------|------------------|---------------|--------|-------|
| Usuario activo | < 2 min | < 2 min | `online` | 🟢 |
| Usuario inactivo (página abierta) | >= 2 min | < 5 min | `away` | 🟡 |
| Usuario cerró página | >= 2 min | >= 5 min | `offline` | ⚫ |
| Usuario volvió después de AWAY | < 2 min | < 2 min | `online` | 🟢 |

**Valores sugeridos**:
- `AWAY_TIMEOUT`: 2 minutos (120 segundos)
- `OFFLINE_TIMEOUT`: 5 minutos (300 segundos)

#### Timeouts Originales (Demasiado Largos)

Los valores de la guía original son excesivamente largos:

| Condición | lastUserActivity | lastHeartbeat | Estado | Emoji |
|-----------|------------------|---------------|--------|-------|
| Usuario activo | < 5 min | < 5 min | `online` | 🟢 |
| Usuario inactivo (página abierta) | >= 5 min | < 15 min | `away` | 🟡 |
| Usuario cerró página | >= 5 min | >= 15 min | `offline` | ⚫ |
| Usuario volvió después de AWAY | < 5 min | < 5 min | `online` | 🟢 |

**Problema**: Un usuario que cierra la pestaña tarda **15 minutos** en aparecer como offline. Demasiado lento.

### Migración de Base de Datos

```sql
-- Agregar nuevas columnas
ALTER TABLE visitor_sessions
ADD COLUMN last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN last_user_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrar datos existentes
UPDATE visitor_sessions
SET
  last_heartbeat = last_activity,
  last_user_activity = last_activity
WHERE last_heartbeat IS NULL;

-- (Opcional) Deprecar columna antigua después de migración
-- ALTER TABLE visitor_sessions DROP COLUMN last_activity;
```

---

## ⚠️ Solución 2: Workaround en Frontend (NO RECOMENDADO)

Si NO puedes cambiar el backend inmediatamente, puedes aplicar este workaround temporal:

### Opción A: Aumentar intervalo de heartbeat a > 5 minutos

```typescript
// ⚠️ WORKAROUND: Aumentar heartbeat a 6 minutos
const sdk = new TrackingPixelSDK({
  presence: {
    heartbeatInterval: 6 * 60 * 1000, // 6 minutos (> 5 min de inactividad)
  }
});
```

**Problema**: Si el usuario cierra la página, tardará 6+ minutos en detectar offline (muy lento).

### Opción B: Desactivar heartbeat automático completamente

```typescript
// ⚠️ WORKAROUND: Desactivar heartbeat automático
// Solo enviar heartbeats en user-interaction

// En presence-service.ts - comentar startHeartbeat()
// this.presenceService.startHeartbeat(); // ❌ Comentar
```

**Problema**: La sesión puede expirar si el usuario no interactúa por mucho tiempo.

### Opción C: Heartbeat condicional (complejo)

```typescript
// ⚠️ WORKAROUND: Solo enviar heartbeat si hubo interacción reciente

class PresenceService {
  private shouldSendHeartbeat(): boolean {
    const now = Date.now();
    const timeSinceInteraction = now - this.lastUserInteractionTime;

    // Solo enviar heartbeat si hubo interacción en últimos 4 min
    // Esto permite que AWAY se active después de 5 min
    return timeSinceInteraction < 4 * 60 * 1000;
  }

  public startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.shouldSendHeartbeat()) {
        this.sendHeartbeat('heartbeat');
      }
    }, this.heartbeatIntervalMs);
  }
}
```

**Problema**: Lógica complicada y frágil. Puede causar desconexiones inesperadas.

---

## 🧪 Testing

### Test Manual

1. Abre `test-away-status.html` en el navegador
2. Abre la consola (F12)
3. NO interactúes con la página
4. Espera 5+ minutos
5. Verifica el estado en el dashboard del backend:
   - ❌ Si sigue "ONLINE" → Backend NO diferencia activityType
   - ✅ Si cambia a "AWAY" → Backend SÍ diferencia correctamente

### Test Automatizado

```typescript
// tests/presence-away-status.spec.ts
import { test, expect } from '@playwright/test';

test('visitor should become AWAY after 5 minutes of inactivity', async ({ page }) => {
  // 1. Abrir página con SDK
  await page.goto('http://localhost:8083/test-away-status.html');

  // 2. Esperar a que el SDK se inicialice
  await page.waitForTimeout(2000);

  // 3. Verificar estado inicial: ONLINE
  const initialStatus = await getVisitorStatus();
  expect(initialStatus).toBe('online');

  // 4. NO interactuar - dejar pasar 5 minutos
  // (en test, podemos simular con clock)
  await page.clock.fastForward('5:01:00'); // 5 min 1 segundo

  // 5. Verificar estado: AWAY
  const statusAfterInactivity = await getVisitorStatus();
  expect(statusAfterInactivity).toBe('away');

  // 6. Hacer un click (simular interacción)
  await page.click('body');
  await page.waitForTimeout(1000);

  // 7. Verificar que vuelve a ONLINE
  const statusAfterInteraction = await getVisitorStatus();
  expect(statusAfterInteraction).toBe('online');
});

async function getVisitorStatus(): Promise<string> {
  // Consultar API del backend
  const response = await fetch('/api/visitors/me/status');
  const data = await response.json();
  return data.connectionStatus;
}
```

---

## 📊 Comparación de Soluciones

| Criterio | Solución 1 (Backend) | Solución 2A (Intervalo 6min) | Solución 2B (Sin heartbeat) | Solución 2C (Condicional) |
|----------|---------------------|------------------------------|----------------------------|---------------------------|
| **Precisión de AWAY** | ✅ Exacto (5 min) | ⚠️ Aprox (6 min) | ✅ Exacto | ⚠️ Complejo |
| **Detección de OFFLINE** | ✅ Rápido (15 min) | ❌ Lento (18+ min) | ❌ Muy lento | ⚠️ Variable |
| **Complejidad** | 🟢 Simple | 🟢 Simple | 🟢 Simple | 🔴 Complejo |
| **Mantenibilidad** | ✅ Fácil | ⚠️ Aceptable | ⚠️ Aceptable | ❌ Difícil |
| **Escalabilidad** | ✅ Excelente | ⚠️ Aceptable | ❌ Problemas | ⚠️ Aceptable |
| **Recomendación** | ✅ **RECOMENDADO** | ⚠️ Temporal | ❌ Evitar | ❌ Evitar |

---

## 🎯 Recomendación Final

### Para Implementación Correcta

**Implementa la Solución 1 (Backend)** lo antes posible:

1. ✅ Agregar campos `lastHeartbeat` y `lastUserActivity` a la base de datos
2. ✅ Actualizar endpoint `/visitors/session/heartbeat` para diferenciar `activityType`
3. ✅ Ajustar lógica de cálculo de estados
4. ✅ Probar con `test-away-status.html`

### Para Workaround Temporal

Si necesitas una solución inmediata mientras se implementa el backend:

1. ⚠️ Usa **Solución 2A** (Aumentar intervalo a 6 minutos)
2. ⚠️ Documenta como "TEMPORAL - Pendiente fix en backend"
3. ⚠️ Crea un ticket/issue para implementar Solución 1

---

## 📞 Contacto

Si tienes dudas sobre la implementación:

1. Revisa `test-away-status.html` para probar el comportamiento
2. Consulta los logs de heartbeat en consola del navegador
3. Verifica el estado en el dashboard del backend
4. Compara con la tabla de estados esperados

---

**Última actualización**: 2025-11-14
**Versión del SDK**: 1.6.0
**Estado**: Pendiente de implementación en backend
