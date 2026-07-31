# Sistema de Comunicación Bidireccional en Tiempo Real - Guía de Implementación SDK

## ✅ Estado: Implementado y Funcional

Sistema completo de comunicación bidireccional entre visitantes y comerciales usando WebSockets para notificaciones en tiempo real y HTTP para envío de mensajes.

---

## 📋 Resumen Ejecutivo

### ¿Qué se implementó en el SDK?

Un sistema de chat en tiempo real que:
- **Visitantes** reciben mensajes instantáneamente via WebSocket
- **Envío de mensajes** se realiza mediante HTTP POST (arquitectura RESTful)
- **Conexión automática** al abrir el chat
- **Reconexión automática** en caso de pérdida de conexión
- **Sincronización** entre mensajes HTTP y notificaciones WebSocket
- **Sin duplicados** - un único mensaje renderizado por cada envío

### Arquitectura

```
Cliente (Visitante/SDK)
    │
    ├─── HTTP POST ────► /v2/messages ────► SendMessageCommandHandler
    │                                              │
    │                                              ▼
    │                                     MessageSentEvent (Domain)
    │                                              │
    │                                              ▼
    │                           NotifyMessageSentOnMessageSentEventHandler
    │                                              │
    │                                              ▼
    │                                      WebSocket Gateway
    │                                              │
    └─── WebSocket ◄────────────────────────── Sala: chat:{chatId}
              (Recepción instantánea)
```

---

## 📁 Archivos Implementados en el SDK

### Nuevos Archivos

1. **Tipos WebSocket**
   - `src/types/websocket-types.ts`
   - Define interfaces para mensajes, eventos y configuración

2. **Servicio WebSocket**
   - `src/services/websocket-service.ts`
   - Gestión de conexión Socket.IO
   - Salas de chat (join/leave)
   - Reconexión automática
   - Patrón Singleton

3. **Gestor de Mensajes en Tiempo Real**
   - `src/services/realtime-message-manager.ts`
   - Coordina WebSocket con ChatUI
   - Transforma eventos WebSocket a formato UI
   - Maneja typing indicators
   - Sincronización mensajes HTTP/WebSocket

4. **Ejemplo Demo**
   - `examples/websocket-realtime-chat-demo.html`
   - Demo interactiva completa
   - Monitoreo de conexión en tiempo real
   - Envío/recepción de mensajes

5. **Documentación**
   - `docs/WEBSOCKET_REALTIME_CHAT.md` (este archivo)

### Archivos Modificados

1. **TrackingPixelSDK**
   - `src/core/tracking-pixel-SDK.ts`
   - Inicialización automática de WebSocket al abrir chat
   - API pública para control de WebSocket
   - Integración con RealtimeMessageManager

2. **Tipos Exportados**
   - `src/types/index.ts`
   - Exporta tipos WebSocket para acceso público

---

## 🚀 Uso en el SDK (Automático)

### El SDK maneja todo automáticamente:

1. **Al abrir el chat** (`chat.show()`):
   - Se conecta WebSocket automáticamente
   - Se une a la sala del chat actual
   - Inicia escucha de eventos `message:new`

2. **Al enviar un mensaje**:
   - Se envía via HTTP POST a `/v2/messages`
   - El backend procesa y emite `message:new` via WebSocket
   - El SDK recibe el evento y renderiza el mensaje
   - **Sin duplicados** - solo renderiza una vez

3. **Al recibir mensajes**:
   - WebSocket emite `message:new`
   - RealtimeMessageManager lo procesa
   - ChatUI renderiza el mensaje automáticamente
   - Scroll al fondo automático

---

## 📦 API Pública del SDK

### Métodos Disponibles

```javascript
// Obtener instancia del SDK
const sdk = window.guiders.trackingPixelSDK;

// ✅ Verificar estado de conexión WebSocket
const isConnected = sdk.isWebSocketConnected();
console.log('WebSocket conectado:', isConnected); // true/false

// ✅ Obtener estado detallado
const state = sdk.getWebSocketState();
console.log('Estado:', state); // 'connected', 'disconnected', 'reconnecting', etc.

// ✅ Enviar mensaje usando sistema tiempo real
await sdk.sendRealtimeMessage('Hola, necesito ayuda', 'text');

// ✅ Desconectar WebSocket manualmente (opcional)
sdk.disconnectWebSocket();

// ✅ Abrir chat (conecta WebSocket automáticamente)
sdk.chatUI.show();
```

---

## 💻 Ejemplo Básico de Uso

### HTML Simple

```html
<!DOCTYPE html>
<html>
<head>
    <title>Chat con WebSocket</title>
</head>
<body>
    <!-- El SDK crea el chat automáticamente -->
    
    <script src="https://tu-cdn.com/guiders-sdk/dist/index.js"></script>
    <script>
        // El SDK se inicializa automáticamente
        
        // Opcional: Verificar estado de conexión
        setInterval(() => {
            const sdk = window.guiders.trackingPixelSDK;
            if (sdk) {
                console.log('WebSocket:', sdk.isWebSocketConnected() ? '✅' : '❌');
                console.log('Estado:', sdk.getWebSocketState());
            }
        }, 5000);

        // Opcional: Escuchar eventos de mensajes enviados
        window.addEventListener('guidersMessageSent', (event) => {
            console.log('Mensaje enviado:', event.detail);
        });
    </script>
</body>
</html>
```

### Configuración Avanzada

```html
<script>
    // Configurar antes de cargar el SDK
    window.GUIDERS_CONFIG = {
        apiKey: 'tu-api-key',
        endpoint: 'https://api.tudominio.com/api',
        // El WebSocket endpoint se resuelve automáticamente
        // pero puedes sobrescribirlo:
        webSocketEndpoint: 'https://api.tudominio.com'
    };
</script>
<script src="https://tu-cdn.com/guiders-sdk/dist/index.js"></script>
```

---

## 🔍 Estructura de Datos

### Mensaje Recibido (message:new)

```typescript
{
  messageId: string;        // UUID del mensaje
  chatId: string;           // UUID del chat
  content: string;          // Contenido del mensaje
  type: 'text' | 'image' | 'file';
  senderId: string;         // UUID del emisor
  senderName: string;       // Nombre del emisor
  sentAt: string;           // ISO 8601 timestamp
  isInternal?: boolean;     // Solo para comerciales (filtrado en SDK)
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }
}
```

### Cambio de Estado (chat:status)

```typescript
{
  chatId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  timestamp: string;        // ISO 8601
}
```

---

## ✅ Checklist de Validación

### Integración Básica
- [x] SDK carga correctamente
- [x] Chat se inicializa sin errores
- [x] Botón de chat visible
- [x] Chat se abre al hacer clic

### WebSocket
- [x] Se conecta automáticamente al abrir chat
- [x] Indicador de conexión funciona
- [x] Se une a sala del chat correctamente
- [x] Reconexión automática tras desconexión

### Mensajería
- [x] Mensajes se envían correctamente (HTTP)
- [x] Mensajes aparecen en UI vía WebSocket
- [x] Sin duplicados (un solo mensaje por envío)
- [x] Mensajes propios y ajenos se distinguen
- [x] Scroll automático al fondo

### Performance
- [x] Sin memory leaks (listeners limpiados)
- [x] Reconexión no crea múltiples conexiones
- [x] UI no se congela con muchos mensajes

---

## 🐛 Troubleshooting

### "WebSocket no se conecta"

**Síntoma**: `isWebSocketConnected()` retorna `false`

**Soluciones**:

1. **Verificar que el chat esté abierto**
   ```javascript
   // WebSocket solo se conecta cuando el chat está visible
   sdk.chatUI.show();
   
   // Esperar un momento
   setTimeout(() => {
       console.log('Conectado:', sdk.isWebSocketConnected());
   }, 1000);
   ```

2. **Verificar endpoint WebSocket**
   ```javascript
   console.log('Endpoint:', window.GUIDERS_CONFIG?.webSocketEndpoint);
   ```

3. **Verificar sesión activa**
   ```javascript
   const sessionId = sessionStorage.getItem('guiders_backend_session_id');
   console.log('Session ID:', sessionId);
   
   // Si no hay sesión, el SDK identifica automáticamente
   ```

### "No recibo mensajes"

**Síntoma**: Envío funciona pero no llegan notificaciones

**Soluciones**:

1. **Verificar que el chat tenga ID**
   ```javascript
   const chatId = sdk.chatUI.getChatId();
   console.log('Chat ID:', chatId);
   
   // Si no hay chatId, enviar un mensaje primero
   // El SDK creará el chat automáticamente
   ```

2. **Verificar sala actual**
   ```javascript
   // El SDK maneja esto internamente, pero puedes revisar:
   const wsService = sdk.wsService; // Acceso interno (no recomendado)
   console.log('Salas:', wsService.getCurrentRooms());
   ```

3. **Revisar consola del navegador**
   ```
   Buscar logs con prefijo:
   📡 [WebSocketService]
   💬 [RealtimeMessageManager]
   📨 Nuevo mensaje recibido
   ```

### "Mensajes duplicados"

**Síntoma**: Cada mensaje aparece 2 o más veces

**Causa**: El SDK maneja esto automáticamente. Si ves duplicados:

1. **Verificar que no estés renderizando manualmente**
   ```javascript
   // ❌ NO HACER ESTO:
   chatInput.onSubmit(async (message) => {
       await ChatV2Service.sendMessage(chatId, message);
       chatUI.renderChatMessage({ text: message, ... }); // ← Duplica
   });
   
   // ✅ El SDK ya lo hace automáticamente
   ```

2. **Verificar versión del SDK**
   ```
   Asegúrate de usar la última versión con WebSocket integrado
   ```

### "Error de conexión CORS"

**Síntoma**: `Cross-Origin Request Blocked` en consola

**Solución**: El backend debe tener CORS configurado:

```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['https://tudominio.com', 'http://localhost:8081'],
  credentials: true
});
```

### "Socket se desconecta constantemente"

**Síntoma**: Conecta y desconecta en loop

**Soluciones**:

1. **Verificar que el sessionId sea válido**
   ```javascript
   const sessionId = sessionStorage.getItem('guiders_backend_session_id');
   console.log('Session ID:', sessionId);
   ```

2. **Revisar logs del backend**
   ```bash
   # Buscar errores de autenticación
   docker logs guiders-backend | grep -i "websocket\|socket"
   ```

---

## 🎯 Características Implementadas

- [x] Conexión WebSocket bidireccional
- [x] Inicialización automática al abrir chat
- [x] Salas de chat por `chatId`
- [x] Notificaciones de mensajes nuevos
- [x] Notificaciones de cambio de estado
- [x] Reconexión automática
- [x] Autenticación con sessionId
- [x] Sincronización HTTP/WebSocket
- [x] Sin duplicados de mensajes
- [x] Manejo robusto de errores
- [x] API pública simple
- [x] Demo interactiva
- [x] Documentación completa

---

## 🔄 Flujo Completo

### Ejemplo: Visitante envía primer mensaje

1. **Usuario** escribe "Hola" y presiona Enter
2. **SDK** verifica si hay `visitorId` (ejecuta `identify` si es necesario)
3. **SDK** verifica si hay `chatId`:
   - Si NO: crea chat nuevo con mensaje via `/v2/chats/with-message`
   - Si SÍ: envía mensaje via `/v2/messages`
4. **Backend** procesa el mensaje
5. **Backend** emite `MessageSentEvent` (dominio)
6. **EventHandler** captura el evento
7. **WebSocketGateway** emite `message:new` a `chat:{chatId}`
8. **SDK (WebSocketService)** recibe el evento
9. **RealtimeMessageManager** procesa y valida
10. **ChatUI** renderiza el mensaje
11. **Usuario** ve su mensaje en la UI

### Ejemplo: Comercial responde

1. **Comercial** envía respuesta desde su panel
2. **Backend** procesa via `/v2/messages`
3. **Backend** emite `message:new` a `chat:{chatId}`
4. **SDK** recibe el evento
5. **RealtimeMessageManager** identifica que es de otro usuario
6. **ChatUI** renderiza como mensaje de "other"
7. **Visitante** ve la respuesta instantáneamente

---

## 🔐 Autenticación

### Visitantes (Automática)
- ✅ Cookie de sesión: `sid`
- ✅ Header: `X-Guiders-Sid`
- ✅ Gestión automática por el SDK

### Comerciales (No aplica al SDK)
- El SDK es solo para visitantes
- Los comerciales usan su propio panel con JWT

---

## 📊 Monitoreo y Debugging

### Logs en Consola

El SDK emite logs prefijados para fácil debugging:

```
🚀 [TrackingPixelSDK] Init
📡 [WebSocketService] Connecting
📡 [WebSocketService] ✅ Connected
💬 [RealtimeMessageManager] Initialized
📨 [RealtimeMessageManager] New message
✅ [ChatUI] Message rendered
```

### Debug Rápido

```javascript
// Verificar estado completo
const sdk = window.guiders.trackingPixelSDK;

console.log({
  visitorId: sdk.getVisitorId(),
  chatId: sdk.chatUI?.getChatId(),
  wsConnected: sdk.isWebSocketConnected(),
  wsState: sdk.getWebSocketState(),
  sessionId: sessionStorage.getItem('guiders_backend_session_id')
});
```

### Demo Interactiva

Usa `examples/websocket-realtime-chat-demo.html` para:
- Monitorear conexión en tiempo real
- Ver estado de WebSocket
- Enviar mensajes de prueba
- Ver log de eventos

---

## 🔧 Configuración Avanzada

### Cambiar Endpoints

```javascript
window.GUIDERS_CONFIG = {
  apiKey: 'tu-api-key',
  endpoint: 'https://api-staging.tudominio.com/api',
  webSocketEndpoint: 'https://api-staging.tudominio.com'
};
```

### Forzar Modo Desarrollo

```html
<!-- Añadir ?dev a la URL del script -->
<script src="https://cdn.com/guiders-sdk/dist/index.js?dev"></script>

<!-- O en la URL de la página -->
<!-- https://tudominio.com?dev -->
```

### Desactivar WebSocket (No Recomendado)

Si por alguna razón necesitas desactivar WebSocket:

```javascript
// Después de cargar el SDK
window.guiders.trackingPixelSDK.disconnectWebSocket();

// Los mensajes seguirán enviándose via HTTP
// pero no recibirás notificaciones en tiempo real
```

---

## 📚 Recursos Adicionales

### Documentación Backend
- `docs/api-ai/endpoint-chat-with-message.md` - API de creación de chats
- `docs/websocket-real-time-chat.md` - Implementación backend completa

### Código Fuente SDK
- `src/services/websocket-service.ts` - Servicio WebSocket
- `src/services/realtime-message-manager.ts` - Gestor de mensajes
- `src/core/tracking-pixel-SDK.ts` - Integración principal
- `src/types/websocket-types.ts` - Tipos TypeScript

### Ejemplos
- `examples/websocket-realtime-chat-demo.html` - Demo interactiva
- `examples/quick-test.html` - Test rápido del SDK

---

## 🎓 Mejores Prácticas

### ✅ DO

```javascript
// ✅ Dejar que el SDK maneje la conexión automáticamente
sdk.chatUI.show(); // Conecta WebSocket automáticamente

// ✅ Verificar estado si necesitas confirmación
if (sdk.isWebSocketConnected()) {
  console.log('Listo para tiempo real');
}

// ✅ Usar la API pública del SDK
await sdk.sendRealtimeMessage('Hola');

// ✅ Confiar en la reconexión automática
// El SDK maneja desconexiones/reconexiones automáticamente
```

### ❌ DON'T

```javascript
// ❌ No conectar WebSocket manualmente
// (el SDK lo hace automáticamente)

// ❌ No renderizar mensajes manualmente
// (RealtimeMessageManager lo hace automáticamente)

// ❌ No crear múltiples conexiones
// (el SDK usa Singleton pattern)

// ❌ No acceder a servicios internos
// sdk.wsService... // ← No recomendado
// sdk.realtimeMessageManager... // ← No recomendado
// Usa la API pública en su lugar
```

---

## 🤝 Soporte

### Si encuentras problemas:

1. **Revisa esta documentación** - Troubleshooting section
2. **Usa la demo** - `examples/websocket-realtime-chat-demo.html`
3. **Revisa los logs** - Busca prefijos 📡💬📨
4. **Verifica la consola** - Errores de conexión/CORS
5. **Comprueba el backend** - Logs del servidor

---

## 📝 Changelog

### v1.0.0 (2025-01-03)
- ✅ Implementación completa de WebSocket bidireccional
- ✅ Integración automática con ChatUI
- ✅ RealtimeMessageManager para sincronización
- ✅ Reconexión automática
- ✅ Sin duplicados de mensajes
- ✅ API pública simple
- ✅ Demo interactiva
- ✅ Documentación completa

---

**Estado**: ✅ **IMPLEMENTADO Y FUNCIONAL**

Sistema de comunicación bidireccional en tiempo real completamente integrado en el SDK. Los visitantes reciben mensajes instantáneamente sin necesidad de configuración adicional.

Última actualización: 3 de enero de 2025
