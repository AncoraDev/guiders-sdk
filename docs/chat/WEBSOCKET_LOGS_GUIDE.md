# 📡 Guía de Logs WebSocket - Guiders SDK

## 🎯 Resumen de Cambios

Se han añadido logs detallados en `src/services/websocket-service.ts` para facilitar el debugging de conexiones WebSocket.

## 📊 Nuevos Logs Añadidos

### 1. **Logs de Inicio de Conexión**
```
📡 [WebSocketService] 🔍 INICIO DE CONEXIÓN WebSocket
📡 [WebSocketService] 📋 Endpoint resuelto: wss://guiders.es
📡 [WebSocketService] 🚀 INTENTANDO CONECTAR a: {url, path, transports, ...}
📡 [WebSocketService] 🌐 URL COMPLETA WebSocket: wss://guiders.es/socket.io
```

**Qué te muestra:**
- La URL exacta a la que intenta conectar
- Configuración completa del socket (transports, credentials, etc.)
- Si tiene token de autenticación o sessionId

### 2. **Logs de Conexión Exitosa**
```
📡 [WebSocketService] ✅✅✅ CONEXIÓN EXITOSA! ✅✅✅
📡 [WebSocketService] 🆔 Socket ID: abc123...
📡 [WebSocketService] 🌐 URL conectada: wss://guiders.es
📡 [WebSocketService] 🚀 Transporte usado: websocket
```

**Qué te muestra:**
- Confirmación de conexión exitosa
- ID único del socket asignado por el servidor
- URL a la que se conectó
- Transporte usado (websocket o polling)

### 3. **Logs de Errores de Conexión**
```
📡 [WebSocketService] ❌❌❌ ERROR DE CONEXIÓN ❌❌❌
📡 [WebSocketService] 🌐 URL intentada: wss://guiders.es
📡 [WebSocketService] 📍 Path: /socket.io/
📡 [WebSocketService] 🚨 Mensaje de error: [mensaje detallado]
📡 [WebSocketService] 📊 Error completo: [objeto error]
📡 [WebSocketService] 🔍 Stack trace: [stack completo]
```

**Qué te muestra:**
- URL exacta que falló
- Path del socket.io
- Mensaje de error descriptivo
- Objeto completo del error para debugging
- Stack trace para rastrear el origen

### 4. **Logs de Desconexión**
```
📡 [WebSocketService] ⚠️⚠️ DESCONECTADO ⚠️⚠️
📡 [WebSocketService] 📋 Razón: [razón de desconexión]
📡 [WebSocketService] 🌐 URL que estaba conectada: wss://guiders.es
```

**Qué te muestra:**
- Razón de la desconexión (io client disconnect, transport close, etc.)
- URL que estaba conectada antes de desconectar

### 5. **Logs de Reconexión**
```
📡 [WebSocketService] 🔄 INTENTO DE RECONEXIÓN #1
📡 [WebSocketService] 🌐 URL: wss://guiders.es
```

**Qué te muestra:**
- Número de intento de reconexión
- URL a la que intenta reconectar

## 🧪 Cómo Probar

### Opción 1: Archivo de Test HTML
Abre `test-websocket-logs.html` en tu navegador:

```bash
# Desde la raíz del proyecto
open test-websocket-logs.html
```

Este archivo incluye:
- ✅ Interfaz visual con botones de prueba
- ✅ Logs en vivo capturados de la consola
- ✅ Estado de conexión en tiempo real
- ✅ Información de endpoints detectados

### Opción 2: Consola del Navegador
1. Abre cualquier página con el SDK cargado
2. Abre DevTools (F12 o Cmd+Option+I)
3. Ve a la pestaña Console
4. Filtra por: `📡` o `WebSocketService`

### Opción 3: Demo PHP
```bash
# Inicia el servidor PHP demo
php -S 127.0.0.1:8083 -t demo/app

# Abre en el navegador
open http://127.0.0.1:8083/
```

## 🔍 Interpretando los Logs

### ✅ Conexión Exitosa
Deberías ver esta secuencia:
```
1. 🔍 INICIO DE CONEXIÓN WebSocket
2. 📋 Endpoint resuelto: wss://guiders.es
3. 🚀 INTENTANDO CONECTAR a: {...}
4. 🌐 URL COMPLETA WebSocket: wss://guiders.es/socket.io
5. ✅ Socket.IO cliente creado
6. 🔌 Esperando conexión...
7. ✅✅✅ CONEXIÓN EXITOSA! ✅✅✅
```

### ❌ Error de Conexión
Si ves errores, verifica:

1. **CORS Error**
   ```
   ❌ Error: Cross-Origin Request Blocked
   ```
   **Solución:** El servidor debe permitir CORS desde tu dominio

2. **Network Error**
   ```
   ❌ Error: xhr poll error
   ```
   **Solución:** Verifica firewall, DNS, o disponibilidad del servidor

3. **Timeout Error**
   ```
   ❌ Error: timeout
   ```
   **Solución:** El servidor no responde a tiempo, verifica conectividad

4. **Authentication Error**
   ```
   ❌ Error: Authentication failed
   ```
   **Solución:** Token o credenciales inválidas

## 📋 Verificación Rápida

### URLs Correctas en Producción
- **HTTP API:** `https://guiders.es/api`
- **WebSocket:** `wss://guiders.es`
- **Socket.IO Path:** `/socket.io/`
- **URL Completa WS:** `wss://guiders.es/socket.io`

### URLs en Desarrollo
- **HTTP API:** `http://localhost:3000/api`
- **WebSocket:** `ws://localhost:3000`
- **Socket.IO Path:** `/socket.io/`
- **URL Completa WS:** `ws://localhost:3000/socket.io`

## 🐛 Debugging Común

### Problema: No veo logs de WebSocket
**Solución:**
1. Verifica que el SDK esté inicializado: `await window.guiders.init()`
2. Verifica que el build esté actualizado: `npm run build`
3. Recarga la página con caché limpio: Cmd+Shift+R (Mac) o Ctrl+Shift+R (Win)

### Problema: Conexión en loop infinito
**Solución:**
- Revisa los logs de reconexión
- Verifica que el servidor WebSocket esté corriendo
- Comprueba la URL en los logs: debe ser `wss://guiders.es` en producción

### Problema: Mixed Content (http/https)
**Solución:**
- En producción DEBE ser `wss://` (no `ws://`)
- Verifica que `isProd: true` en los logs de endpoints
- Si `isProd: false`, fuerza con `window.GUIDERS_CONFIG = {environment: 'production'}`

## 📝 Notas Adicionales

### Configuración del Endpoint
El WebSocket se configura automáticamente según el entorno:

```typescript
// Producción (por defecto)
isProd = true → wss://guiders.es

// Desarrollo (con ?dev en URL)
isProd = false → ws://localhost:3000
```

### Override Manual
Puedes forzar un endpoint específico:

```javascript
window.GUIDERS_CONFIG = {
    webSocketEndpoint: 'wss://tu-servidor.com'
};
```

## 🚀 Próximos Pasos

1. **Rebuild:** `npm run build`
2. **Copiar a demo:** `cp dist/index.js demo/app/guiders-sdk.js`
3. **Probar:** Abre `test-websocket-logs.html`
4. **Verificar logs:** Busca `📡` en la consola
5. **Confirmar URL:** Debe ser `wss://guiders.es/socket.io`

---

**Documentado:** 3 de octubre de 2025  
**Versión SDK:** 1.0.5  
**Archivo:** `/src/services/websocket-service.ts`
