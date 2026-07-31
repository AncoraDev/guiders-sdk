# Dev Random Messages - Guía de Uso

## 📝 Descripción

`DevRandomMessages` es un script integrado en el SDK de Guiders que permite generar mensajes aleatorios para testing y desarrollo. Este script se activa automáticamente **solo en modo desarrollo** para evitar spam en producción.

## 🚀 Funcionalidades

- ✅ **Activación automática**: Solo se carga en modo development (`?dev` en la URL)
- ✅ **Comando simple**: Escribe `#random` en el chat para activar
- ✅ **Endpoint real**: Usa el servicio real de chat para enviar mensajes
- ✅ **Mensajes variados**: 40+ mensajes predefinidos de diferentes tipos
- ✅ **Interfaz global**: Control programático desde la consola
- ✅ **Configuración flexible**: Personalizable en tiempo real

## 💬 Uso Básico

### Método 1: Comando en el Chat

1. Abre el chat en una página con el SDK en modo dev
2. Escribe `#random` en el campo de mensaje
3. Presiona enviar
4. Los mensajes aleatorios se generarán automáticamente

```
Usuario: #random
[SDK genera 5 mensajes aleatorios con intervalos de 1-3 segundos]
```

### Método 2: Interfaz Global (Consola)

```javascript
// Verificar disponibilidad
console.log(window.guidersDevRandomMessages);

// Generar mensajes manualmente
await window.guidersDevRandomMessages.trigger('chatId-aquí', 3);

// Obtener configuración actual
const config = window.guidersDevRandomMessages.getConfig();
console.log(config);
```

## ⚙️ Configuración

### Configuración por Defecto

```javascript
{
  enabled: true,
  minInterval: 1000,    // 1 segundo mínimo entre mensajes
  maxInterval: 3000,    // 3 segundos máximo entre mensajes
  messageCount: 5       // 5 mensajes por comando
}
```

### Personalizar Configuración

```javascript
// Cambiar número de mensajes y velocidad
window.guidersDevRandomMessages.setConfig({
  messageCount: 10,
  minInterval: 500,     // Más rápido
  maxInterval: 1500
});

// Verificar nueva configuración
window.guidersDevRandomMessages.getConfig();
```

## 📄 Tipos de Mensajes

El script incluye mensajes variados para testing:

### Preguntas sobre productos
- "¿Tienen descuentos disponibles?"
- "¿Cuál es el tiempo de entrega?"
- "¿Aceptan devoluciones?"

### Comentarios casuales  
- "Me gusta mucho este producto"
- "Estoy interesado en más información"
- "¿Hay más colores disponibles?"

### Mensajes técnicos de testing
- "Testing scroll infinito 🧪"
- "Verificando respuestas automáticas"
- "Debug de mensajes largos: Lorem ipsum..."

### Emojis y expresiones
- "😀 ¡Excelente servicio!"
- "🛒 Quiero comprar esto"
- "⭐ 5 estrellas para esta tienda"

### Casos especiales
- Mensajes con saltos de línea
- Caracteres especiales: ñÑáéíóúÁÉÍÓÚ
- Enlaces: https://ejemplo.com

## 🔧 API Programática

### Métodos Disponibles

```javascript
// Generar mensajes manualmente
await guidersDevRandomMessages.trigger(chatId, messageCount?);

// Configurar parámetros
guidersDevRandomMessages.setConfig(config);

// Obtener configuración actual
const config = guidersDevRandomMessages.getConfig();

// Verificar estado
const isEnabled = guidersDevRandomMessages.isEnabled();
const isGenerating = guidersDevRandomMessages.isGenerating();
```

### Ejemplos de Uso

```javascript
// Generar 3 mensajes rápidos
window.guidersDevRandomMessages.setConfig({
  messageCount: 3,
  minInterval: 500,
  maxInterval: 1000
});

// Obtener chat ID actual y generar mensajes
const chatId = window.guiders.getChatId();
if (chatId) {
  await window.guidersDevRandomMessages.trigger(chatId);
}

// Agregar mensajes personalizados
window.guidersDevRandomMessages.addCustomMessages([
  "Mensaje personalizado 1",
  "Pregunta específica del dominio",
  "Test case especial 🧪"
]);
```

## 🛡️ Seguridad

### Restricciones de Seguridad

- ❌ **Deshabilitado en producción**: Solo funciona cuando `isProd = false`
- ✅ **Modo desarrollo**: Requiere `?dev` en la URL o configuración dev
- ✅ **Endpoint real**: Usa el servicio real de chat (dev: localhost:3000)
- ✅ **Validación**: Los mensajes pasan por la validación normal del SDK

### Logs de Seguridad

```
🎲 [DevRandomMessages] ❌ Deshabilitado en modo producción
🎲 [DevRandomMessages] ✅ Inicializado en modo desarrollo
```

## 🧪 Testing y Debugging

### Logs de Debug

El script genera logs detallados para debugging:

```
🎲 [DevRandomMessages] 🎯 Comando #random detectado
🎲 [DevRandomMessages] 🚀 Iniciando generación de 5 mensajes aleatorios
🎲 [DevRandomMessages] 📤 Mensaje 1/5: "Testing scroll infinito 🧪"
🎲 [DevRandomMessages] ✅ Generación de mensajes completada
```

### Verificación Manual

```javascript
// Verificar estado completo
console.log({
  available: !!window.guidersDevRandomMessages,
  enabled: window.guidersDevRandomMessages?.isEnabled(),
  generating: window.guidersDevRandomMessages?.isGenerating(),
  config: window.guidersDevRandomMessages?.getConfig()
});
```

## 🚨 Resolución de Problemas

### Problema: El script no se carga

**Solución**: Verificar que estés en modo desarrollo
```javascript
// Verificar endpoints
import { resolveDefaultEndpoints } from './core/endpoint-resolver';
console.log(resolveDefaultEndpoints()); // isProd debe ser false
```

### Problema: #random no funciona

**Verificación**:
1. ¿Está el chat abierto?
2. ¿Está el SDK inicializado?
3. ¿Hay un chat ID disponible?

```javascript
console.log({
  chatOpen: !!document.querySelector('.chat-widget [active]'),
  sdkReady: !!window.guiders,
  chatId: window.guiders?.getChatId()
});
```

### Problema: Los mensajes no aparecen

**Diagnóstico**:
```javascript
// Verificar conexión con backend
console.log('Endpoint:', window.guiders?.options?.endpoint);

// Verificar logs en consola para errores de red
// Los mensajes deben aparecer en los logs como: 
// [ChatV2Service] ✅ Mensaje enviado: [ID]
```

## 📊 Métricas y Rendimiento

### Impacto en el Bundle

- **Tamaño**: ~10KB minificado
- **Carga condicional**: Solo se carga en modo dev
- **Dependencias**: Reutiliza servicios existentes del SDK

### Uso de Red

- **Endpoint**: http://localhost:3000/api (desarrollo)
- **Método**: POST a `/chat/{chatId}/messages`
- **Frecuencia**: Configurable (1-3 segundos por defecto)

## 🔄 Historial de Versiones

### v1.0.0 (Inicial)
- ✅ Comando `#random` en chat
- ✅ 40+ mensajes predefinidos  
- ✅ Configuración básica
- ✅ Interfaz global

### Próximas Funcionalidades
- 🚧 Mensajes con archivos adjuntos
- 🚧 Plantillas de mensajes por dominio
- 🚧 Integración con WebSocket para respuestas
- 🚧 Modo "conversación" con hilos de mensajes

## 📝 Notas para Desarrolladores

### Integración en el SDK

El script se importa automáticamente en `src/index.ts`:

```typescript
// Solo en modo dev - se auto-inicializa
import "./core/dev-random-messages";
```

### Eventos Personalizados

El script escucha el evento `guidersMessageSent` que se dispara desde `tracking-pixel-SDK.ts`:

```typescript
// Evento disparado automáticamente al enviar mensaje
const customEvent = new CustomEvent('guidersMessageSent', {
  detail: {
    message: message,
    chatId: chatId,
    isNewChat: isNewChat
  }
});
window.dispatchEvent(customEvent);
```

### Extensibilidad

Para agregar nuevos tipos de mensajes:

```typescript
// En dev-random-messages.ts
private readonly randomMessages = [
  // ... mensajes existentes
  "Nuevo tipo de mensaje",
  "Otro mensaje para testing"
];
```