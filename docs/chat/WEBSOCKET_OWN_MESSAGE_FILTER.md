# 🚫 Filtrado de Mensajes Propios en WebSocket

## Problema

Cuando un visitante enviaba un mensaje en el chat:

1. ✅ El mensaje se renderizaba **instantáneamente** en la UI (optimistic rendering)
2. 📤 Se enviaba via **HTTP POST** al backend
3. 📡 El backend devolvía el mensaje via **WebSocket** (`message:new` event)
4. ❌ El frontend renderizaba el mensaje **de nuevo**, creando un **duplicado**

## Solución

Se implementó un filtro en `RealtimeMessageManager.handleNewMessage()` que verifica si el mensaje recibido via WebSocket pertenece al visitante actual:

```typescript
// FILTRO CRÍTICO: Ignorar mensajes propios que vienen del WebSocket
if (message.senderId === this.visitorId) {
    console.log('💬 [RealtimeMessageManager] 🚫 Mensaje propio ignorado (ya renderizado)');
    return; // Early exit - no renderizar
}
```

## Flujo Actual (Correcto)

### 1️⃣ Visitante envía mensaje
```
Usuario escribe → ChatUI → RealtimeMessageManager.sendMessage()
                                     ↓
                           Renderizado instantáneo (optimistic UI)
                                     ↓
                           HTTP POST /v2/messages
```

### 2️⃣ Backend procesa y notifica
```
Backend recibe → Guarda en BD → Emite via WebSocket a TODOS los participantes
                                 (incluyendo el visitante que envió)
```

### 3️⃣ Frontend filtra el eco
```
WebSocket 'message:new' → RealtimeMessageManager.handleNewMessage()
                                     ↓
                   ¿senderId === visitorId? 
                         ↙YES        ↘NO
                    🚫 FILTRAR      ✅ RENDERIZAR
                    (ignorar)       (mensaje de comercial/bot)
```

## Ventajas

- **Sin duplicados**: Cada mensaje aparece solo una vez en la UI
- **UX optimista**: El visitante ve su mensaje instantáneamente (no espera la confirmación del servidor)
- **Sincronización real-time**: Los mensajes de comerciales llegan en tiempo real via WebSocket
- **Arquitectura limpia**: Separación clara entre envío (HTTP) y recepción (WebSocket)

## Filtros Aplicados en `handleNewMessage()`

El método aplica **tres filtros** antes de renderizar:

1. **Chat ID**: Solo procesa mensajes del chat activo actual
   ```typescript
   if (message.chatId !== this.currentChatId) return;
   ```

2. **Mensajes internos**: Oculta notas internas de comerciales
   ```typescript
   if (message.isInternal) return;
   ```

3. **Mensajes propios**: Ignora el eco de mensajes del visitante (NUEVO ✨)
   ```typescript
   if (message.senderId === this.visitorId) return;
   ```

## Testing

Se incluye test HTML interactivo: `test-websocket-filter-own-messages.html`

### Cómo probar:

1. Abrir `test-websocket-filter-own-messages.html` en el navegador
2. Hacer clic en "🚀 Inicializar SDK"
3. Escribir un mensaje y hacer clic en "📤 Enviar Mensaje"
4. Observar el log:
   - ✅ Mensaje se renderiza instantáneamente
   - 📤 Se envía via HTTP
   - 📡 Llega el eco via WebSocket
   - 🚫 **El eco se filtra y NO se renderiza de nuevo**
5. Contador "Mensajes filtrados" debe incrementarse

### Resultado esperado:

```
✅ Mensaje se renderiza 1 vez (instantáneo)
📡 WebSocket recibe eco del mensaje
🚫 SDK detecta y filtra el eco (no renderiza de nuevo)
✅ Sin duplicados en el chat
```

## Compatibilidad

- ✅ Compatible con chat v1 y v2
- ✅ Compatible con mensajes de comerciales
- ✅ Compatible con mensajes de bots
- ✅ Compatible con múltiples participantes en el chat
- ✅ No afecta mensajes de welcome / sistema

## Logs de Debug

Cuando se filtra un mensaje propio:

```
💬 [RealtimeMessageManager] 📨 Procesando mensaje nuevo: {
  messageId: "abc-123",
  chatId: "chat-456", 
  senderId: "visitor-789",
  ...
}
💬 [RealtimeMessageManager] 🚫 Mensaje propio ignorado (ya renderizado): {
  messageId: "abc-123",
  visitorId: "visitor-789"
}
```

## Archivos Modificados

- `src/services/realtime-message-manager.ts` - Filtro en `handleNewMessage()`
- `test-websocket-filter-own-messages.html` - Test interactivo
- `.github/copilot-instructions.md` - Documentación del patrón

## Referencias

- Arquitectura WebSocket: [`WEBSOCKET_REALTIME_CHAT.md`](./WEBSOCKET_REALTIME_CHAT.md)
- Tipos WebSocket: `src/types/websocket-types.ts`
- Service WebSocket: `src/services/websocket-service.ts`
