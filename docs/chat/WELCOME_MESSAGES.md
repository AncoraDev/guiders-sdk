# Mensajes de Bienvenida - Guiders SDK

Los mensajes de bienvenida aparecen automáticamente cuando un usuario abre el chat por primera vez, creando una experiencia más cálida y profesional.

## 🎯 Configuración por Defecto (CDN)

Cuando usas el SDK via CDN sin WordPress, se aplica automáticamente esta configuración:

```javascript
{
  enabled: true,
  style: 'friendly',
  includeEmojis: true,
  language: 'es',
  showTips: true
}
```

**Resultado:** "¡Hola! 👋 Me alegra que estés aquí. Soy tu asistente virtual y estoy listo para ayudarte con cualquier pregunta que tengas. ¿En qué puedo ayudarte hoy? 😊"

## ⚙️ Configuración Personalizada

### Método 1: GUIDERS_CONFIG (Antes de cargar el SDK)

```html
<script>
window.GUIDERS_CONFIG = {
  apiKey: 'tu-api-key',
  welcomeMessage: {
    enabled: true,
    style: 'professional',
    language: 'en',
    includeEmojis: false,
    showTips: true
  }
};
</script>
<script src="https://cdn.guiders.es/sdk/latest/index.js"></script>
```

### Método 2: Cambios Dinámicos (Después de cargar el SDK)

```javascript
// Cambiar estilo
window.guiders.updateWelcomeMessage({
  style: 'casual',
  includeEmojis: true
});

// Mensaje completamente personalizado
window.guiders.updateWelcomeMessage({
  style: 'custom',
  customMessage: '¡Hola! Soy María, tu asesora personal. ¿En qué puedo ayudarte?'
});
```

## 🎨 Estilos Disponibles

### 😊 Friendly (Amigable)
- **Tono:** Cálido y acogedor
- **Ideal para:** Marcas cercanas, pequeños negocios, startups
- **Ejemplo:** "¡Hola! 👋 Me alegra que estés aquí..."

### 👔 Professional (Profesional) 
- **Tono:** Formal y confiable
- **Ideal para:** Empresas corporativas, servicios B2B, consultoras
- **Ejemplo:** "Buenos días/tardes. Bienvenido a nuestro servicio de atención al cliente..."

### 🤙 Casual (Casual)
- **Tono:** Relajado y moderno
- **Ideal para:** Marcas jóvenes, tecnología, gaming
- **Ejemplo:** "¡Hey! ¿Qué tal? Soy tu chat de soporte..."

### 🌟 Helpful (Útil)
- **Tono:** Enfocado en soluciones
- **Ideal para:** Soporte técnico, servicios de ayuda
- **Ejemplo:** "¡Hola y bienvenido! Estoy aquí para hacer tu experiencia lo más fácil posible..."

### ✏️ Custom (Personalizado)
- **Tono:** Tu propio mensaje
- **Ideal para:** Casos específicos, branding personalizado
- **Requiere:** Definir `customMessage`

## 🏢 Plantillas de Negocio (Solo WordPress)

En WordPress, puedes seleccionar plantillas predefinidas:

### 🛍️ E-commerce
```javascript
welcomeMessage: {
  style: 'custom',
  customMessage: '¡Hola! 🛍️ Bienvenido a nuestra tienda. Estoy aquí para ayudarte con tus compras, seguimiento de pedidos, devoluciones o cualquier pregunta sobre nuestros productos. ¿En qué puedo asistirte?'
}
```

### 💻 SaaS
```javascript
welcomeMessage: {
  style: 'custom',
  customMessage: '¡Hola! 💻 Bienvenido al soporte técnico. Estoy aquí para ayudarte con configuración, resolución de problemas, facturación o cualquier duda sobre nuestro software. ¡Cuéntame qué necesitas!'
}
```

### 🏥 Salud
```javascript
welcomeMessage: {
  style: 'custom',
  customMessage: '¡Hola! 🏥 Bienvenido a nuestro centro de atención. Estoy aquí para ayudarte con citas, información sobre servicios, seguros médicos o consultas generales. ¿Cómo puedo ayudarte hoy?'
}
```

### 📚 Educación
```javascript
welcomeMessage: {
  style: 'custom',
  customMessage: '¡Hola! 📚 Bienvenido a nuestro centro de aprendizaje. Estoy aquí para ayudarte con cursos, inscripciones, material de estudio o cualquier consulta académica. ¿Qué necesitas saber?'
}
```

### 💰 Finanzas
```javascript
welcomeMessage: {
  style: 'custom',
  customMessage: '¡Hola! 💰 Bienvenido a nuestros servicios financieros. Estoy aquí para ayudarte con consultas sobre cuentas, transacciones, inversiones o servicios bancarios. ¿En qué puedo asistirte?'
}
```

## 🌐 Configuración de Idioma

### Español (es)
```javascript
welcomeMessage: {
  language: 'es'
}
```

### Inglés (en)
```javascript
welcomeMessage: {
  language: 'en'
}
```

## 🎛️ Opciones Adicionales

### includeEmojis
```javascript
welcomeMessage: {
  includeEmojis: false // Desactiva emojis para un tono más formal
}
```

### showTips
```javascript
welcomeMessage: {
  showTips: true // Muestra consejos adicionales después del mensaje principal
}
```

**Tips incluidos:**
- 💡 Tip: Sé específico en tu consulta para obtener una respuesta más rápida
- ⏱️ Tiempo promedio de respuesta: 2-5 minutos
- 📱 Este chat funciona desde cualquier dispositivo

## 📋 Configuración Completa

```javascript
window.GUIDERS_CONFIG = {
  apiKey: 'tu-api-key',
  welcomeMessage: {
    enabled: true,                    // true/false
    style: 'friendly',               // 'friendly'|'professional'|'casual'|'helpful'|'custom'
    customMessage: 'Mensaje custom', // Solo si style='custom'
    language: 'es',                  // 'es'|'en'
    includeEmojis: true,             // true/false
    showTips: true                   // true/false
  }
};
```

## 🔧 API de Control

### Obtener configuración actual
```javascript
const config = window.guiders.getWelcomeMessageConfig();
console.log(config);
```

### Verificar si chat está visible
```javascript
const isVisible = window.guiders.isChatVisible();
```

### Mostrar/ocultar chat
```javascript
window.guiders.showChat();
window.guiders.hideChat();
```

### Resetear chat
```javascript
window.guiders.resetChat(); // Cierra y vuelve a abrir
```

## 🚀 Ejemplos de Uso

### E-commerce con WooCommerce
```html
<script>
window.GUIDERS_CONFIG = {
  apiKey: 'ecommerce-key',
  welcomeMessage: {
    style: 'custom',
    customMessage: '¡Hola! 🛍️ ¿Necesitas ayuda con algún producto? Estoy aquí para asesorarte en tu compra.',
    includeEmojis: true,
    showTips: false
  }
};
</script>
```

### Servicio Técnico
```html
<script>
window.GUIDERS_CONFIG = {
  apiKey: 'support-key',
  welcomeMessage: {
    style: 'helpful',
    language: 'es',
    includeEmojis: false,
    showTips: true
  }
};
</script>
```

### Startup Casual
```html
<script>
window.GUIDERS_CONFIG = {
  apiKey: 'startup-key',
  welcomeMessage: {
    style: 'casual',
    language: 'es',
    includeEmojis: true,
    showTips: false
  }
};
</script>
```

## ⚠️ Notas Importantes

1. **Orden de carga:** Siempre define `GUIDERS_CONFIG` antes de cargar el script del SDK
2. **WordPress:** Si usas WordPress, configura desde el panel de administración
3. **Cache:** Los cambios dinámicos no persisten en recargas de página
4. **Fallback:** Si hay errores en la configuración, se usa el mensaje por defecto
5. **Timing:** Los tips aparecen 2 segundos después del mensaje principal

## 🔍 Debug

Para verificar que la configuración se aplicó correctamente:

```javascript
// En la consola del navegador
console.log('Configuración:', window.guiders.getWelcomeMessageConfig());
console.log('Chat visible:', window.guiders.isChatVisible());
```

Los logs del SDK mostrarán información sobre la inicialización de mensajes:
- `💬 [ChatUI] Mensaje de bienvenida generado: ...`
- `💬 [ChatUI] ✅ Mensaje de bienvenida agregado`