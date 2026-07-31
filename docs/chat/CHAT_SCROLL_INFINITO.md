# Sistema de Chat con Scroll Infinito

## 📋 Resumen

Se ha implementado un sistema completo de carga de mensajes de chat con scroll infinito que cumple con todos los requerimientos especificados:

✅ **Scroll automático al bottom** cuando se abre el chat  
✅ **Scroll infinito hacia arriba** para cargar mensajes antiguos  
✅ **Carga suave** sin afectar la experiencia del usuario  
✅ **Cursor-based pagination** compatible con la API v2  
✅ **Interfaz simple y mantenible**  

## 🏗️ Arquitectura

### Componentes Principales

#### 1. `MessagePaginationService`
- **Ubicación**: `src/services/message-pagination-service.ts`
- **Responsabilidad**: Maneja las llamadas HTTP a la API v2 para cargar mensajes
- **Características**:
  - Carga inicial de mensajes más recientes
  - Carga incremental con cursor-based pagination
  - Validación de cursors
  - Manejo de errores y logging

#### 2. `ChatMessagesUI`
- **Ubicación**: `src/presentation/chat-messages-ui.ts`
- **Responsabilidad**: Interfaz de usuario y lógica de scroll infinito
- **Características**:
  - Renderizado de mensajes
  - Detección de scroll para cargar más mensajes
  - Scroll automático al bottom
  - Indicadores de carga
  - Gestión de estado del scroll infinito

#### 3. Tipos TypeScript
- **Ubicación**: `src/types/index.ts`
- **Nuevos tipos**: `MessageV2`, `MessageListResponse`
- **Compatibilidad**: Mantiene tipos existentes y añade nuevos

## 🔌 API Compatibility

### Estructura de Mensajes
```typescript
interface MessageV2 {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    type: string;
    isInternal: boolean;
    isFirstResponse: boolean;
    createdAt: string;
    updatedAt: string;
}
```

### Respuesta de la API
```typescript
interface MessageListResponse {
    messages: MessageV2[];
    total: number;
    hasMore: boolean;
    cursor?: string;
}
```

### Endpoints Utilizados

#### Carga Inicial
```
GET /api/v2/messages/chat/{chatId}?limit=20
```

#### Carga con Cursor
```
GET /api/v2/messages/chat/{chatId}?limit=20&cursor=eyJsYXN0SWQiOiJiMWU5MTMwZi01MmIwLTQ5MDktOGY4OS1jZDMwYTNjMmE4MGQiLCJvZmZzZXQiOjUwfQ%3D%3D
```

## 🚀 Uso Básico

### Inicialización Simple
```typescript
import { ChatMessagesUI } from './src/presentation/chat-messages-ui';

// 1. Obtener el contenedor
const container = document.getElementById('chat-messages');

// 2. Crear instancia
const chatUI = new ChatMessagesUI(container);

// 3. Inicializar con chat ID
await chatUI.initializeChat('9efcc62d-fb34-42e1-8414-62f3bc55180f');
```

### Agregar Mensaje en Tiempo Real
```typescript
const nuevoMensaje = {
    id: 'msg-123',
    chatId: 'chat-456',
    senderId: 'user-789',
    content: 'Nuevo mensaje',
    type: 'TEXT',
    isInternal: false,
    isFirstResponse: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

chatUI.addNewMessage(nuevoMensaje);
```

### Control Manual del Scroll
```typescript
// Ir al final
chatUI.scrollToBottom();

// Obtener estado
const estado = chatUI.getScrollState();
console.log(estado); // { hasMore: true, isLoading: false, messageCount: 25 }
```

## 🔧 Configuración

### Variables de Entorno
```typescript
// Configurar endpoints
window.GUIDERS_CONFIG = {
    endpoint: 'http://localhost:3000/api',
    wsEndpoint: 'ws://localhost:3000'
};
```

### Autenticación
El servicio utiliza los siguientes headers automáticamente:
- `Authorization: Bearer {accessToken}` (desde localStorage)
- `X-Guiders-Sid: {sessionId}` (desde sessionStorage)
- `credentials: 'include'` para cookies

## 📱 Experiencia de Usuario

### Al Abrir el Chat
1. Se cargan los 20 mensajes más recientes
2. Se hace scroll automático al bottom
3. Se configura el listener de scroll infinito

### Durante el Scroll
1. Cuando el usuario llega a 100px del top, se activa la carga
2. Se muestra un indicador de "Cargando mensajes anteriores..."
3. Se cargan 20 mensajes más antiguos
4. Se mantiene la posición de scroll relativa (sin salto)
5. Se oculta el indicador de carga

### Nuevos Mensajes
1. Los mensajes nuevos se agregan al final
2. Se hace scroll automático al bottom
3. Animación suave de entrada

## 🎨 Estilos CSS

### Estructura HTML Generada
```html
<div class="chat-messages-container">
    <div class="chat-message" data-message-id="msg-123">
        <div class="message-wrapper user-message">
            <div class="message-content">
                <div class="message-text">Contenido del mensaje</div>
                <div class="message-time">14:30</div>
            </div>
        </div>
    </div>
    <!-- Más mensajes... -->
</div>
```

### CSS Inline Aplicado
- Mensajes del usuario: fondo azul, alineado a la derecha
- Mensajes de otros: fondo blanco, alineado a la izquierda
- Timestamps formateados (HH:MM)
- Scroll suave y responsivo

## 🧪 Testing

### Archivo de Prueba
- **Ubicación**: `examples/test-chat-scroll-infinito.html`
- **Funcionalidades**:
  - Inicialización manual del chat
  - Agregar mensajes de prueba
  - Control manual del scroll
  - Estado en tiempo real

### Ejemplo de Integración
- **Ubicación**: `examples/chat-scroll-infinito-example.ts`
- **Incluye**: Clase de ejemplo completa con casos de uso típicos

## 🔍 Logging y Debug

### Prefijos de Log
- `📋 [MessagePagination]`: Servicio de paginación
- `💬 [ChatMessagesUI]`: Interfaz de usuario
- `📊 [Test]`: Archivo de prueba
- `✅/❌`: Éxito/Error en operaciones

### Información de Debug
```typescript
// Estado del scroll infinito
console.log(chatUI.getScrollState());

// Validación de cursor
MessagePaginationService.getInstance().isValidCursor(cursor);
```

## ⚙️ Configuraciones Avanzadas

### Personalizar Límites
```typescript
const SCROLL_THRESHOLD = 100; // pixels desde el top
const MESSAGE_LIMIT = 20; // mensajes por página
```

### Manejo de Errores
```typescript
try {
    await chatUI.initializeChat(chatId);
} catch (error) {
    console.error('Error inicializando chat:', error);
    // Manejar error apropiadamente
}
```

### Limpieza de Recursos
```typescript
// Al cerrar el chat o cambiar de página
chatUI.destroy();
```

## 🚨 Consideraciones Importantes

### Rendimiento
- Los mensajes se renderizan bajo demanda
- Scroll suave con `requestAnimationFrame`
- Limpieza automática de event listeners

### Compatibilidad
- Mantiene compatibilidad con sistema existente
- Nuevos tipos no interfieren con código legacy
- Importaciones dinámicas para reducir bundle size

### Seguridad
- Escape automático de HTML en contenido de mensajes
- Validación de cursors de paginación
- Headers de autenticación seguros

## 📦 Archivos Modificados/Creados

### Nuevos Archivos
- `src/services/message-pagination-service.ts`
- `src/presentation/chat-messages-ui.ts`
- `examples/test-chat-scroll-infinito.html`
- `examples/chat-scroll-infinito-example.ts`

### Archivos Modificados
- `src/types/index.ts` (nuevos tipos añadidos)

### Build y Compilación
- ✅ TypeScript compilation exitosa
- ✅ Webpack build exitoso
- ✅ Tipos estrictos validados
- ✅ Bundle size optimizado

## 🎯 Próximos Pasos

1. **Testing E2E**: Crear tests automatizados con Playwright
2. **Optimizaciones**: Virtualización para grandes cantidades de mensajes
3. **Funcionalidades**: Búsqueda en historial, filtros de mensajes
4. **Integración**: WebSocket para mensajes en tiempo real
5. **Métricas**: Tracking de rendimiento y uso

---

**Estado**: ✅ Implementación completa y funcional  
**Fecha**: Septiembre 2025  
**Versión**: v2.0.0