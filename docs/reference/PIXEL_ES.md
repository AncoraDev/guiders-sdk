# Píxel de Seguimiento Guiders SDK

## Introducción

El Píxel de Seguimiento Guiders SDK es una herramienta integral para capturar datos de movimiento de visitantes en sitios web. Incluye funcionalidades de tracking de eventos, chat en vivo, detección de bots y seguimiento automático del DOM.

## Instalación

### Mediante npm

```bash
npm install guiders-pixel
```

### Mediante script directo

#### Método 1: Usando atributo data-api-key

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" data-api-key="YOUR_API_KEY"></script>
```

#### Método 2: Usando parámetro en URL

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js?apiKey=YOUR_API_KEY"></script>
```

## Integración Básica

### Opción 1: Atributo data-api-key

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" data-api-key="YOUR_API_KEY"></script>
```

### Opción 2: Parámetro en URL

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js?apiKey=YOUR_API_KEY"></script>
```

### Opción 3: Inicialización manual

```javascript
import { TrackingPixelSDK, BotDetector } from 'guiders-pixel';

// Configuración del SDK
const options = {
  apiKey: 'YOUR_API_KEY',
  autoFlush: true,
  flushInterval: 1000,
  maxRetries: 2,
  endpoint: 'https://your-api-endpoint.com/api',
  webSocketEndpoint: 'wss://your-websocket-endpoint.com'
};

// Detección de bots (opcional)
const detector = new BotDetector();
detector.detect().then(result => {
  if (!result.isBot) {
    // Inicializar solo para usuarios legítimos
    const sdk = new TrackingPixelSDK(options);
    sdk.init().then(() => {
      console.log('SDK inicializado correctamente');
      sdk.enableDOMTracking();
    });
  }
});
```

## Opciones de Configuración

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
|-----------|------|-----------|-------------|-------------|
| `apiKey` | string | Sí | - | Clave API para autenticación |
| `endpoint` | string | No | <https://guiders.es/api/> | URL del endpoint de la API |
| `webSocketEndpoint` | string | No | wss://guiders.ancoradual.com | URL del WebSocket |
| `autoFlush` | boolean | No | true | Envío automático de eventos |
| `flushInterval` | number | No | 1000 | Intervalo de envío en milisegundos |
| `maxRetries` | number | No | 2 | Número máximo de reintentos |

## Tracking Automático del DOM

El SDK incluye tracking automático para eventos de e-commerce comunes. Simplemente añade atributos `data-track-event` a tus elementos HTML:

### Eventos Soportados

#### Eventos Básicos de E-commerce
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `page_view` | DOMContentLoaded | Vista de página |
| `view_product` | mouseenter | Visualización de producto |
| `add_to_cart` | click | Añadir al carrito |
| `view_cart` | mouseenter | Ver carrito |
| `purchase` | click | Compra completada |

#### Eventos Específicos de Vehículos

**Búsqueda de Vehículos**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `search_vehicle_type` | change | Selección de tipo de vehículo |
| `search_brand` | change | Selección de marca |
| `search_model` | change | Selección de modelo |
| `search_fuel` | change | Selección de combustible |
| `search_price_type` | change | Tipo de búsqueda (precio/cuota) |
| `search_submit` | click | Envío de búsqueda |
| `search_input` | input | Búsqueda libre de texto |
| `sort_vehicles` | change | Ordenación de resultados |

**Filtros Avanzados**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `filter_by_price` | change | Filtro por precio |
| `filter_by_payment` | change | Filtro por cuota mensual |
| `filter_by_year` | change | Filtro por año |
| `filter_by_transmission` | change | Filtro por transmisión |
| `filter_by_doors` | change | Filtro por número de puertas |
| `filter_by_mileage` | change | Filtro por kilometraje |
| `filter_by_condition` | change | Filtro por condición |
| `toggle_advanced_filters` | click | Mostrar/ocultar filtros avanzados |

**Comparación de Vehículos**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `add_to_comparison` | click | Añadir vehículo a comparación |
| `remove_from_comparison` | click | Eliminar de comparación |
| `select_comparison_vehicle` | click | Seleccionar vehículo para comparar |
| `view_vehicle_comparison` | mouseenter | Ver comparación de vehículos |
| `save_comparison` | click | Guardar comparación |
| `export_comparison` | click | Exportar comparación |
| `share_comparison` | click | Compartir comparación |
| `clear_comparison` | click | Limpiar comparación |

**Interacciones de Usuario**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `contact_dealer` | click | Contactar concesionario |
| `schedule_test_drive` | click | Programar prueba de conducción |
| `request_quote` | click | Solicitar cotización |
| `view_vehicle_details` | click | Ver detalles del vehículo |
| `view_vehicle_gallery` | click | Ver galería de imágenes |
| `view_vehicle_specs` | click | Ver especificaciones |
| `view_vehicle_history` | click | Ver historial del vehículo |
| `download_brochure` | click | Descargar folleto |
| `calculate_financing` | click | Calcular financiación |
| `add_to_favorites` | click | Añadir a favoritos |
| `view_vehicle_location` | mouseenter | Ver ubicación del vehículo |

**Analytics y Dashboard**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `analytics_dashboard_view` | mouseenter | Ver dashboard de analytics |
| `export_analytics` | click | Exportar datos de analytics |
| `share_analytics` | click | Compartir analytics |

**Chat Específico para Vehículos**
| Evento | Trigger | Descripción |
|--------|---------|-------------|
| `chat_ask_about_vehicle` | click | Preguntar sobre vehículo |
| `chat_request_financing` | click | Solicitar financiación por chat |
| `chat_schedule_viewing` | click | Programar visita por chat |

### Ejemplos de Uso

```html
<!-- Vista de producto -->
<div data-track-event="view_product" 
     data-product-id="12345" 
     data-product-name="Producto Ejemplo"
     data-price="29.99"
     data-category="Electronics">
  <h3>Producto Ejemplo</h3>
</div>

<!-- Botón añadir al carrito -->
<button data-track-event="add_to_cart"
        data-product-id="12345"
        data-quantity="1">
  Añadir al Carrito
</button>

<!-- Vista de carrito -->
<div data-track-event="view_cart" 
     data-cart-value="89.97"
     data-items-count="3">
  Ver Carrito
</div>

<!-- Botón de compra -->
<button data-track-event="purchase"
        data-order-id="ORD-12345"
        data-total="89.97"
        data-currency="EUR">
  Completar Compra
</button>

<!-- Vista de página (automático) -->
<div data-track-event="page_view" 
     data-page-title="Página de Inicio"
     data-page-url="/inicio">
</div>
```

#### Ejemplos Específicos de Vehículos

##### Búsqueda de Vehículos

```html
<!-- Selección de tipo de vehículo -->
<select data-track-event="search_vehicle_type"
        data-search-type="vehicle_type">
  <option value="nuevo">🚗 Vehículo nuevo</option>
  <option value="ocasion">🔄 Vehículo de ocasión</option>
  <option value="km0">⭐ Vehículo km0</option>
  <option value="comercial">🚚 Vehículo comercial</option>
</select>

<!-- Selección de marca -->
<select data-track-event="search_brand"
        data-search-type="brand">
  <option value="audi">Audi</option>
  <option value="bmw">BMW</option>
  <option value="mercedes">Mercedes-Benz</option>
  <option value="volkswagen">Volkswagen</option>
</select>

<!-- Filtro de precio -->
<input type="range" 
       data-track-event="filter_by_price"
       data-filter-type="price_range"
       data-min-price="5000"
       data-max-price="100000"
       min="5000" max="100000" step="1000" value="30000">

<!-- Búsqueda libre -->
<input type="text" 
       data-track-event="search_input"
       data-search-type="free_text"
       placeholder="Ej: Audi A3 2020 automático blanco Madrid...">

<!-- Botón de búsqueda -->
<button data-track-event="search_submit"
        data-search-form="vehicle_search">
  🔍 Buscar Vehículos
</button>
```

##### Tarjeta de Vehículo con Comparación

```html
<!-- Tarjeta de vehículo completa -->
<div class="vehicle-card"
     data-track-event="view_product"
     data-vehicle-id="v001"
     data-vehicle-brand="Audi"
     data-vehicle-model="A3"
     data-vehicle-location="Madrid"
     data-vehicle-price="28500">
  
  <!-- Imagen del vehículo -->
  <div class="vehicle-image">
    <img src="audi-a3.jpg" alt="Audi A3 Sportback">
    
    <!-- Botón de favoritos -->
    <button data-track-event="add_to_favorites"
            data-vehicle-id="v001"
            data-vehicle-brand="Audi"
            data-vehicle-model="A3">
      ♡ Favorito
    </button>
  </div>
  
  <!-- Información del vehículo -->
  <div class="vehicle-info">
    <h3>Audi A3 Sportback 1.5 TFSI</h3>
    <p>2022 • 15.000 km • Gasolina • Automático</p>
    <p>📍 Madrid, España</p>
    <div class="price">28.500 €</div>
    <p>Desde 245 €/mes</p>
    
    <!-- Acciones del vehículo -->
    <div class="vehicle-actions">
      <!-- Ver ubicación -->
      <button data-track-event="view_vehicle_location"
              data-vehicle-id="v001"
              data-vehicle-location="Madrid">
        📍 Ver ubicación
      </button>
      
      <!-- Ver detalles -->
      <button data-track-event="view_vehicle_details"
              data-vehicle-id="v001">
        🔍 Ver detalles
      </button>
      
      <!-- Añadir a comparación -->
      <button data-track-event="add_to_comparison"
              data-vehicle-id="v001"
              data-vehicle-brand="Audi"
              data-vehicle-model="A3"
              data-vehicle-price="28500">
        ⚖️ Comparar
      </button>
    </div>
    
    <!-- Calcular financiación -->
    <button data-track-event="calculate_financing"
            data-vehicle-id="v001"
            data-vehicle-price="28500"
            data-financing-type="calculator">
      🧮 Calcular financiación
    </button>
  </div>
</div>
```

##### Filtros Avanzados

```html
<div class="advanced-filters">
  <!-- Filtro por año -->
  <select data-track-event="filter_by_year"
          data-filter-type="year_from">
    <option value="">Cualquier año</option>
    <option value="2024">2024</option>
    <option value="2023">2023</option>
    <option value="2022">2022</option>
    <option value="2021">2021</option>
  </select>
  
  <!-- Filtro por transmisión -->
  <select data-track-event="filter_by_transmission"
          data-filter-type="transmission">
    <option value="">Cualquier transmisión</option>
    <option value="manual">Manual</option>
    <option value="automatico">Automático</option>
    <option value="secuencial">Secuencial</option>
  </select>
  
  <!-- Filtro por número de puertas -->
  <select data-track-event="filter_by_doors"
          data-filter-type="doors">
    <option value="">Cualquier número</option>
    <option value="3">3 puertas</option>
    <option value="5">5 puertas</option>
    <option value="4">4 puertas (sedan)</option>
  </select>
  
  <!-- Filtro por kilometraje -->
  <input type="range"
         data-track-event="filter_by_mileage"
         data-filter-type="mileage_range"
         data-max-mileage="200000"
         min="0" max="200000" step="5000" value="100000">
  
  <!-- Botón mostrar/ocultar filtros -->
  <button data-track-event="toggle_advanced_filters"
          data-action="toggle_filters">
    🔧 Filtros Avanzados
  </button>
</div>
```

##### Panel de Comparación

```html
<!-- Panel flotante de comparación -->
<div class="comparison-panel">
  <h3>Comparar Vehículos</h3>
  
  <!-- Vehículos en comparación -->
  <div class="comparison-slots">
    <div class="comparison-slot">
      <span>Audi A3</span>
      <button data-track-event="remove_from_comparison"
              data-vehicle-id="v001">×</button>
    </div>
    <div class="comparison-slot">
      <span>BMW Serie 3</span>
      <button data-track-event="remove_from_comparison"
              data-vehicle-id="v002">×</button>
    </div>
  </div>
  
  <!-- Acciones de comparación -->
  <div class="comparison-actions">
    <button data-track-event="view_vehicle_comparison"
            data-comparison-count="2"
            data-comparison-vehicles="v001,v002">
      Ver Comparación (2)
    </button>
    
    <button data-track-event="save_comparison"
            data-comparison-vehicles="v001,v002">
      💾 Guardar
    </button>
    
    <button data-track-event="export_comparison"
            data-export-format="pdf"
            data-comparison-vehicles="v001,v002">
      📄 Exportar PDF
    </button>
    
    <button data-track-event="share_comparison"
            data-share-method="link">
      🔗 Compartir
    </button>
    
    <button data-track-event="clear_comparison">
      🗑️ Limpiar Todo
    </button>
  </div>
</div>
```

##### Interacciones con Concesionarios

```html
<!-- Contactar concesionario -->
<button data-track-event="contact_dealer"
        data-vehicle-id="v001"
        data-dealer-id="dealer123"
        data-dealer-name="Concesionario Madrid Norte"
        data-contact-method="phone">
  📞 Contactar Concesionario
</button>

<!-- Programar prueba de conducción -->
<button data-track-event="schedule_test_drive"
        data-vehicle-id="v001"
        data-vehicle-brand="Audi"
        data-vehicle-model="A3"
        data-dealer-location="Madrid">
  🚗 Programar Prueba de Conducción
</button>

<!-- Solicitar cotización -->
<button data-track-event="request_quote"
        data-vehicle-id="v001"
        data-quote-type="financing"
        data-financing-amount="28500">
  💰 Solicitar Cotización
</button>

<!-- Descargar folleto -->
<button data-track-event="download_brochure"
        data-vehicle-id="v001"
        data-brochure-type="specifications"
        data-format="pdf">
  📋 Descargar Folleto
</button>
```

##### Página de Detalles del Vehículo

```html
<!-- Galería de imágenes -->
<div class="vehicle-gallery">
  <button data-track-event="view_vehicle_gallery"
          data-vehicle-id="v001"
          data-gallery-action="open">
    🖼️ Ver Galería (12 fotos)
  </button>
</div>

<!-- Pestañas de información -->
<div class="vehicle-tabs">
  <button data-track-event="view_vehicle_specs"
          data-vehicle-id="v001"
          data-tab="specifications">
    📋 Especificaciones
  </button>
  
  <button data-track-event="view_vehicle_history"
          data-vehicle-id="v001"
          data-tab="history">
    📈 Historial
  </button>
</div>

<!-- Calculadora de financiación detallada -->
<form class="financing-calculator">
  <input type="number" 
         data-track-event="filter_by_price"
         data-filter-type="vehicle_price"
         placeholder="Precio del vehículo">
  
  <input type="number"
         data-track-event="filter_by_payment"
         data-filter-type="down_payment"
         placeholder="Entrada">
  
  <select data-track-event="filter_by_payment"
          data-filter-type="loan_term">
    <option value="36">36 meses</option>
    <option value="48">48 meses</option>
    <option value="60">60 meses</option>
  </select>
  
  <button data-track-event="calculate_financing"
          data-vehicle-id="v001"
          data-financing-type="detailed_calculator">
    🧮 Calcular Cuota Mensual
  </button>
</form>
```

##### Analytics Dashboard

```html
<!-- Métricas principales -->
<div class="analytics-overview">
  <div data-track-event="analytics_dashboard_view"
       data-metric="page_views"
       data-timeframe="24h">
    <div class="stat-number">1,247</div>
    <div class="stat-label">Visualizaciones de página</div>
    <div class="stat-change">+12% vs ayer</div>
  </div>
  
  <div data-track-event="analytics_dashboard_view"
       data-metric="vehicle_searches">
    <div class="stat-number">856</div>
    <div class="stat-label">Búsquedas de vehículos</div>
    <div class="stat-change">+8% vs ayer</div>
  </div>
  
  <div data-track-event="analytics_dashboard_view"
       data-metric="vehicle_comparisons">
    <div class="stat-number">234</div>
    <div class="stat-label">Comparaciones realizadas</div>
    <div class="stat-change">+23% vs ayer</div>
  </div>
</div>

<!-- Exportar analytics -->
<div class="export-options">
  <button data-track-event="export_analytics"
          data-export-type="full_report"
          data-export-format="pdf"
          data-timeframe="30d">
    📄 Reporte Completo (PDF)
  </button>
  
  <button data-track-event="export_analytics"
          data-export-type="data_export"
          data-export-format="csv">
    📊 Datos en CSV
  </button>
  
  <button data-track-event="share_analytics"
          data-share-type="dashboard_link"
          data-share-duration="7d">
    🔗 Compartir Dashboard
  </button>
</div>
```

##### Chat Específico para Vehículos

```html
<!-- Botones de chat contextual -->
<div class="vehicle-chat-actions">
  <!-- Preguntar sobre vehículo específico -->
  <button data-track-event="chat_ask_about_vehicle"
          data-vehicle-id="v001"
          data-vehicle-brand="Audi"
          data-vehicle-model="A3"
          data-chat-topic="vehicle_inquiry">
    💬 Preguntar sobre este Audi A3
  </button>

  <!-- Solicitar financiación por chat -->
  <button data-track-event="chat_request_financing"
          data-vehicle-id="v001"
          data-financing-amount="28500"
          data-chat-topic="financing"
          data-preferred-payment="monthly">
    💰 Consultar Opciones de Financiación
  </button>

  <!-- Programar visita por chat -->
  <button data-track-event="chat_schedule_viewing"
          data-vehicle-id="v001"
          data-dealer-location="Madrid"
          data-chat-topic="schedule_viewing"
          data-availability="weekends">
    📅 Programar Visita al Concesionario
  </button>
</div>

<!-- Mensajes predefinidos para el chat -->
<div class="chat-quick-messages">
  <button data-track-event="chat_ask_about_vehicle"
          data-message-template="availability"
          data-vehicle-id="v001">
    "¿Está disponible este vehículo?"
  </button>
  
  <button data-track-event="chat_request_financing"
          data-message-template="financing_options">
    "¿Qué opciones de financiación tienen?"
  </button>
  
  <button data-track-event="chat_schedule_viewing"
          data-message-template="test_drive">
    "Me gustaría hacer una prueba de conducción"
  </button>
</div>
```

## Tracking Personalizado

### Envío de Eventos Personalizados

```javascript
// Evento básico
await window.guiders.track({
  event: 'custom_event',
  user_id: '12345',
  action: 'button_click',
  value: 100
});

// Evento con metadatos adicionales
await window.guiders.track({
  event: 'newsletter_signup',
  email: 'user@example.com',
  source: 'footer_form',
  timestamp: Date.now()
});
```

### Gestión de Eventos

```javascript
// Escuchar eventos
window.guiders.on('receive-message', (message) => {
  console.log('Mensaje recibido:', message);
});

// Escuchar evento una sola vez
window.guiders.once('visitor:open-chat', (event) => {
  console.log('Chat abierto por primera vez');
});

// Dejar de escuchar eventos
function messageHandler(msg) {
  console.log('Manejador de mensaje:', msg);
}
window.guiders.on('receive-message', messageHandler);
window.guiders.off('receive-message', messageHandler);
```

### Control del Envío de Datos

```javascript
// Envío manual inmediato
await window.guiders.flush();

// Detener envío automático
window.guiders.stopAutoFlush();

// Añadir metadatos a eventos específicos
window.guiders.setMetadata('purchase', {
  affiliate_id: 'AFF123',
  campaign: 'black_friday_2024'
});
```

## Detección de Bots

El SDK incluye detección automática de bots para evitar tracking de crawlers y bots. La detección analiza:

- User Agent del navegador
- Características del navegador (plugins, webdriver, etc.)
- Tiempos de carga de página
- Comportamiento de interacción del usuario

### Configuración Personalizada

```javascript
import { BotDetector } from 'guiders-pixel';

const detector = new BotDetector();
detector.detect().then(result => {
  console.log('¿Es un bot?:', result.isBot);
  console.log('Probabilidad:', result.probability);
  console.log('Detalles:', result.details);
  
  if (result.probability < 0.3) {
    // Umbral personalizado más permisivo
    initializeSDK();
  }
});
```

## Chat en Vivo

El SDK incluye funcionalidad de chat en vivo integrada:

### Características del Chat

- Inicialización lazy (sin parpadeo)
- Carga diferida de contenido
- Notificaciones de mensajes no leídos
- WebSocket para tiempo real
- Detección automática de typing

### Eventos de Chat

```javascript
// El chat se inicializa automáticamente y se oculta por defecto
// Los eventos se trackean automáticamente:

// - visitor:open-chat: Cuando el usuario abre el chat
// - visitor:close-chat: Cuando el usuario cierra el chat  
// - visitor:send-message: Cuando el usuario envía un mensaje
// - receive-message: Cuando se recibe un mensaje del asesor
```

### Personalización del Chat

```javascript
// Añadir mensajes del sistema
window.addEventListener('add-system-message', (event) => {
  console.log('Mensaje del sistema:', event.detail.message);
});

// Escuchar apertura/cierre del chat
window.guiders.on('visitor:open-chat', (event) => {
  console.log('Chat abierto:', event.data);
});

window.guiders.on('visitor:close-chat', (event) => {
  console.log('Chat cerrado:', event.data);
});
```

## Pipeline de Procesamiento

El SDK utiliza un sistema de pipeline para procesar eventos:

```javascript
// Añadir etapas personalizadas al pipeline
window.guiders.addPipelineStage({
  name: 'custom-validator',
  process: (event) => {
    // Validación personalizada
    if (event.type === 'purchase' && !event.data.order_id) {
      throw new Error('order_id es requerido para eventos de compra');
    }
    return event;
  }
});
```

## Ejemplos Completos

### E-commerce Básico

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mi Tienda</title>
</head>
<body>
  <!-- Tracking automático de página -->
  <div data-track-event="page_view" 
       data-page-title="Catálogo de Productos"
       data-page-category="shop"></div>

  <!-- Producto -->
  <div class="product" 
       data-track-event="view_product"
       data-product-id="PROD-001"
       data-product-name="Smartphone XYZ"
       data-price="299.99"
       data-category="Electronics">
    
    <h2>Smartphone XYZ</h2>
    <p>Precio: €299.99</p>
    
    <button data-track-event="add_to_cart"
            data-product-id="PROD-001"
            data-price="299.99"
            data-quantity="1">
      Añadir al Carrito
    </button>
  </div>

  <!-- Carrito -->
  <div data-track-event="view_cart"
       data-cart-value="299.99"
       data-items-count="1">
    <h3>Tu Carrito</h3>
    <p>Total: €299.99</p>
    
    <button data-track-event="purchase"
            data-order-id="ORD-789"
            data-total="299.99"
            data-currency="EUR"
            data-payment-method="credit_card">
      Finalizar Compra
    </button>
  </div>

  <!-- Integración del SDK -->
  <script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" 
          data-api-key="your-api-key-here"></script>
</body>
</html>
```

### Integración Avanzada

```javascript
// Configuración completa con manejo de errores
async function initializeGuiders() {
  try {
    const options = {
      apiKey: 'YOUR_API_KEY',
      endpoint: 'https://your-api.com/api',
      webSocketEndpoint: 'wss://your-api.com',
      autoFlush: true,
      flushInterval: 2000,
      maxRetries: 3
    };

    // Verificar si es un bot
    const detector = new BotDetector();
    const detection = await detector.detect();
    
    if (detection.isBot) {
      console.log('Bot detectado, no se inicializa tracking');
      return;
    }

    // Inicializar SDK
    const sdk = new TrackingPixelSDK(options);
    window.guiders = sdk;
    
    await sdk.init();
    sdk.enableDOMTracking();

    // Tracking personalizado
    await sdk.track({
      event: 'page_load',
      page: window.location.pathname,
      referrer: document.referrer,
      timestamp: Date.now()
    });

    console.log('Guiders SDK inicializado correctamente');
    
  } catch (error) {
    console.error('Error inicializando Guiders SDK:', error);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGuiders);
} else {
  initializeGuiders();
}
```

## Resolución de Problemas

### Problemas Comunes

1. **SDK no se inicializa**
   - Verificar que la API key sea correcta
   - Comprobar la conexión con el servidor
   - Revisar si se detectó como bot incorrectamente

2. **Eventos no se envían**
   - Verificar que `autoFlush` esté habilitado
   - Comprobar la configuración de `flushInterval`
   - Revisar errores en la consola del navegador

3. **Chat no aparece**
   - El chat está oculto por defecto hasta que el usuario lo active
   - Verificar la conexión WebSocket
   - Comprobar que los tokens sean válidos

### Debugging

```javascript
// Habilitar logs detallados
console.log('Estado del SDK:', {
  hasValidTokens: TokenManager.hasValidTokens(),
  isConnected: window.guiders.isConnected?.(),
  eventQueue: window.guiders.eventQueue?.length
});

// Verificar detección de bots
const detector = new BotDetector();
detector.detect().then(result => {
  console.log('Detección de bot:', result);
});
```

## Soporte

Para obtener soporte técnico o reportar problemas:

1. Revisar la documentación completa
2. Verificar la configuración de la API key
3. Comprobar la consola del navegador en busca de errores
4. Contactar al equipo de soporte con detalles específicos del problema

---

## Versionado

Versión actual: 1.0.5

## Gestión de Sesión Visitante (API Visitors V2)

La versión actual del SDK utiliza únicamente la API V2 de visitantes para gestionar identidad y ciclo de vida de sesión. Se han eliminado los endpoints legacy (`/visitor/me`).

### Flujo en la inicialización
1. Generación/recuperación de `fingerprint`.
2. Obtención/renovación de tokens internos (`ensureTokens`).
3. `POST /visitors/identify` con `{ fingerprint }` (crea o actualiza visitante y abre sesión backend, cookie HttpOnly).
4. Precarga de hasta 20 chats recientes (`GET /v2/chats/visitor/:visitorId`).
5. Inicio de heartbeat backend cada 30s (`POST /visitors/session/heartbeat`).
6. Inicio del tracking avanzado de sesión interna (eventos: `session_start`, `user_idle`, `user_resume`, `session_end`).

### Endpoints usados (sin fallback)
| Operación | Endpoint | Método | Notas |
|-----------|----------|--------|-------|
| Identificar visitante | `/visitors/identify` | POST | Devuelve `visitorId` y opcional `sessionId` (guardado en `sessionStorage`). |
| Heartbeat de sesión | `/visitors/session/heartbeat` | POST | Mantiene viva la sesión backend (cada 30s). |
| Cierre explícito | `/visitors/session/end` | POST | Llamado en `cleanup()` y en `beforeunload` (beacon). |

### Eventos emitidos por el Session Tracking interno
| Evento | Descripción |
|--------|-------------|
| `session_start` | Nueva sesión lógica del navegador. |
| `user_idle` | Usuario inactivo > `maxInactivityTime` (default 60s). |
| `user_resume` | Regresa de estado idle. |
| `session_reactivate` | Reactiva tras haber estado totalmente inactiva (tab oculta y vuelve). |
| `session_end` | Fin explícito (cleanup manual) o cierre completo cuando se llama a `endSession`. |

### Cierre y descarga de página
Antes de cerrar la pestaña/ventana:
1. Se realiza un flush best-effort de la cola de eventos:
   - Si WebSocket está conectado: se envía cada evento directamente.
   - Si no: se usa `navigator.sendBeacon` → `POST /tracking/events/batch` (debes asegurar que el backend lo soporte).
2. Se envía `endSession` con `sendBeacon` (o `fetch keepalive` si no hay soporte).

### Personalización de heartbeat
Actualmente el intervalo está fijado en 30s para el backend y 10s para la lógica de sesión interna. Si necesitas hacerlo configurable abre una incidencia para exponer `visitorHeartbeatInterval` en las opciones del SDK.

### Consideraciones de migración desde V1
| V1 | Estado en V2 |
|----|--------------|
| `/visitor/me` | Eliminado. Los datos básicos se obtienen vía `identify`. |
| Perfil extendido (nombre/email) vía `visitor/me` | Debes ampliar la respuesta de `identify` en backend si lo necesitas temprano. |
| Reuso condicional de chat vía fallback | Ahora siempre se basa en chats V2 precargados. |

### Ejemplo rápido (identificación manual adicional)
```javascript
import { VisitorsV2Service } from 'guiders-pixel/dist/services/visitors-v2-service';

async function reIdentify() {
  const fp = localStorage.getItem('fingerprint');
  if (!fp) return;
  const data = await VisitorsV2Service.getInstance().identify(fp);
  console.log('Re-identificado:', data);
}
```

### Problemas comunes
| Problema | Causa probable | Acción |
|----------|----------------|--------|
| No se crea sesión backend | Cookie bloqueada por políticas (SameSite / 3rd party) | Revisar flags de cookie y contexto (iframe / dominio). |
| Heartbeat falla intermitente | Pérdida de conexión / pestaña en background profundo | Se recupera solo; sólo investigar si hay >5 fallos consecutivos. |
| Eventos perdidos al cerrar | Navegador cierra demasiado rápido / endpoint batch ausente | Implementar `/tracking/events/batch` y monitorizar diferencia entre contadores enviados vs recibidos. |

---


Para más información sobre cambios y actualizaciones, consultar el archivo README.md del proyecto.