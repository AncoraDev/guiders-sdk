# Guiders SDK Tracking Pixel

## Introduction

The Guiders SDK Tracking Pixel is a comprehensive tool for capturing visitor movement data on websites. It includes event tracking functionality, live chat, bot detection, and automatic DOM tracking.

## Installation

### Via npm

```bash
npm install guiders-pixel
```

### Via direct script

#### Method 1: Using data-api-key attribute

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" data-api-key="YOUR_API_KEY"></script>
```

#### Method 2: Using URL parameter

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js?apiKey=YOUR_API_KEY"></script>
```

## Basic Integration

### Option 1: data-api-key attribute

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" data-api-key="YOUR_API_KEY"></script>
```

### Option 2: URL parameter

```html
<script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js?apiKey=YOUR_API_KEY"></script>
```

### Option 3: Manual initialization

### Option 3: Manual initialization

```javascript
import { TrackingPixelSDK, BotDetector } from 'guiders-pixel';

// SDK configuration
const options = {
  apiKey: 'YOUR_API_KEY',
  autoFlush: true,
  flushInterval: 1000,
  maxRetries: 2,
  endpoint: 'https://your-api-endpoint.com/api',
  webSocketEndpoint: 'wss://your-websocket-endpoint.com'
};

// Bot detection (optional)
const detector = new BotDetector();
detector.detect().then(result => {
  if (!result.isBot) {
    // Initialize only for legitimate users
    const sdk = new TrackingPixelSDK(options);
    sdk.init().then(() => {
      console.log('SDK initialized successfully');
      sdk.enableDOMTracking();
    });
  }
});
```

## Configuration Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | API key for authentication |
| `endpoint` | string | No | <https://guiders.es/api/> | API endpoint URL |
| `webSocketEndpoint` | string | No | wss://guiders.ancoradual.com | WebSocket endpoint URL |
| `autoFlush` | boolean | No | true | Automatic event sending |
| `flushInterval` | number | No | 1000 | Send interval in milliseconds |
| `maxRetries` | number | No | 2 | Maximum number of retries |

## Automatic DOM Tracking

The SDK includes automatic tracking for common e-commerce events. Simply add `data-track-event` attributes to your HTML elements:

### Supported Events

#### Basic E-commerce Events
| Event | Trigger | Description |
|-------|---------|-------------|
| `page_view` | DOMContentLoaded | Page view |
| `view_product` | mouseenter | Product view |
| `add_to_cart` | click | Add to cart |
| `view_cart` | mouseenter | View cart |
| `purchase` | click | Purchase completed |

#### Vehicle-Specific Events

**Vehicle Search**
| Event | Trigger | Description |
|-------|---------|-------------|
| `search_vehicle_type` | change | Vehicle type selection |
| `search_brand` | change | Brand selection |
| `search_model` | change | Model selection |
| `search_fuel` | change | Fuel type selection |
| `search_price_type` | change | Search type (price/payment) |
| `search_submit` | click | Search submission |
| `search_input` | input | Free text search |
| `sort_vehicles` | change | Sort results |

**Advanced Filters**
| Event | Trigger | Description |
|-------|---------|-------------|
| `filter_by_price` | change | Filter by price |
| `filter_by_payment` | change | Filter by monthly payment |
| `filter_by_year` | change | Filter by year |
| `filter_by_transmission` | change | Filter by transmission |
| `filter_by_doors` | change | Filter by number of doors |
| `filter_by_mileage` | change | Filter by mileage |
| `filter_by_condition` | change | Filter by condition |
| `toggle_advanced_filters` | click | Show/hide advanced filters |

**Vehicle Comparison**
| Event | Trigger | Description |
|-------|---------|-------------|
| `add_to_comparison` | click | Add vehicle to comparison |
| `remove_from_comparison` | click | Remove from comparison |
| `select_comparison_vehicle` | click | Select vehicle for comparison |
| `view_vehicle_comparison` | mouseenter | View vehicle comparison |
| `save_comparison` | click | Save comparison |
| `export_comparison` | click | Export comparison |
| `share_comparison` | click | Share comparison |
| `clear_comparison` | click | Clear comparison |

**User Interactions**
| Event | Trigger | Description |
|-------|---------|-------------|
| `contact_dealer` | click | Contact dealer |
| `schedule_test_drive` | click | Schedule test drive |
| `request_quote` | click | Request quote |
| `view_vehicle_details` | click | View vehicle details |
| `view_vehicle_gallery` | click | View image gallery |
| `view_vehicle_specs` | click | View specifications |
| `view_vehicle_history` | click | View vehicle history |
| `download_brochure` | click | Download brochure |
| `calculate_financing` | click | Calculate financing |
| `add_to_favorites` | click | Add to favorites |
| `view_vehicle_location` | mouseenter | View vehicle location |

**Analytics and Dashboard**
| Event | Trigger | Description |
|-------|---------|-------------|
| `analytics_dashboard_view` | mouseenter | View analytics dashboard |
| `export_analytics` | click | Export analytics data |
| `share_analytics` | click | Share analytics |

**Vehicle-Specific Chat**
| Event | Trigger | Description |
|-------|---------|-------------|
| `chat_ask_about_vehicle` | click | Ask about vehicle |
| `chat_request_financing` | click | Request financing via chat |
| `chat_schedule_viewing` | click | Schedule viewing via chat |

### Usage Examples

#### Basic E-commerce Examples

```html
<!-- Product view -->
<div data-track-event="view_product" 
     data-product-id="12345" 
     data-product-name="Example Product"
     data-price="29.99"
     data-category="Electronics">
  <h3>Example Product</h3>
</div>

<!-- Add to cart button -->
<button data-track-event="add_to_cart"
        data-product-id="12345"
        data-quantity="1">
  Add to Cart
</button>

<!-- Cart view -->
<div data-track-event="view_cart" 
     data-cart-value="89.97"
     data-items-count="3">
  View Cart
</div>

<!-- Purchase button -->
<button data-track-event="purchase"
        data-order-id="ORD-12345"
        data-total="89.97"
        data-currency="EUR">
  Complete Purchase
</button>
```

#### Vehicle Search Examples

```html
<!-- Vehicle type selector -->
<select data-track-event="search_vehicle_type" 
        data-search-context="main-search">
  <option value="new">New Vehicles</option>
  <option value="used">Used Vehicles</option>
  <option value="certified">Certified Pre-Owned</option>
</select>

<!-- Brand selector -->
<select data-track-event="search_brand" 
        data-search-context="main-search">
  <option value="toyota">Toyota</option>
  <option value="honda">Honda</option>
  <option value="ford">Ford</option>
</select>

<!-- Free text search -->
<input type="text" 
       data-track-event="search_input" 
       data-search-type="vehicle"
       placeholder="Search vehicles...">

<!-- Search submit button -->
<button data-track-event="search_submit"
        data-search-type="vehicle"
        data-filters-applied="brand,model,price">
  Search Vehicles
</button>

<!-- Sort results -->
<select data-track-event="sort_vehicles" 
        data-results-count="24">
  <option value="price_asc">Price: Low to High</option>
  <option value="price_desc">Price: High to Low</option>
  <option value="year_desc">Newest First</option>
</select>
```

#### Advanced Filters Examples

```html
<!-- Price range filter -->
<input type="range" 
       data-track-event="filter_by_price"
       data-filter-type="price"
       data-min-value="0"
       data-max-value="50000"
       min="0" max="100000">

<!-- Year filter -->
<select data-track-event="filter_by_year"
        data-filter-category="specifications">
  <option value="2024">2024</option>
  <option value="2023">2023</option>
  <option value="2022">2022</option>
</select>

<!-- Transmission filter -->
<input type="checkbox" 
       data-track-event="filter_by_transmission"
       data-filter-value="automatic"
       value="automatic">

<!-- Advanced filters toggle -->
<button data-track-event="toggle_advanced_filters"
        data-filters-visible="false">
  Show Advanced Filters
</button>
```

#### Vehicle Comparison Examples

```html
<!-- Add to comparison button -->
<button data-track-event="add_to_comparison"
        data-vehicle-id="V123456"
        data-vehicle-brand="Toyota"
        data-vehicle-model="Corolla"
        data-vehicle-year="2024"
        data-vehicle-price="25000">
  Compare
</button>

<!-- Comparison view -->
<div data-track-event="view_vehicle_comparison"
     data-vehicles-count="2"
     data-comparison-id="CMP-789">
  <h2>Vehicle Comparison</h2>
</div>

<!-- Export comparison -->
<button data-track-event="export_comparison"
        data-export-format="pdf"
        data-vehicles-count="2">
  Export as PDF
</button>

<!-- Save comparison -->
<button data-track-event="save_comparison"
        data-comparison-name="My Comparison"
        data-vehicles-count="3">
  Save Comparison
</button>
```

#### Vehicle Details Examples

```html
<!-- Vehicle details view -->
<div data-track-event="view_vehicle_details"
     data-vehicle-id="V123456"
     data-vehicle-brand="Toyota"
     data-vehicle-model="Corolla"
     data-vehicle-year="2024"
     data-vehicle-price="25000"
     data-dealer-id="D789">
  <h1>2024 Toyota Corolla</h1>
</div>

<!-- Image gallery -->
<div data-track-event="view_vehicle_gallery"
     data-vehicle-id="V123456"
     data-images-count="15">
  <img src="vehicle-image.jpg" alt="Vehicle Image">
</div>

<!-- Specifications tab -->
<button data-track-event="view_vehicle_specs"
        data-vehicle-id="V123456"
        data-tab="specifications">
  Specifications
</button>

<!-- Vehicle history -->
<button data-track-event="view_vehicle_history"
        data-vehicle-id="V123456"
        data-history-available="true">
  Vehicle History
</button>
```

#### User Interaction Examples

```html
<!-- Contact dealer -->
<button data-track-event="contact_dealer"
        data-vehicle-id="V123456"
        data-dealer-id="D789"
        data-contact-method="phone">
  Call Dealer
</button>

<!-- Schedule test drive -->
<button data-track-event="schedule_test_drive"
        data-vehicle-id="V123456"
        data-dealer-id="D789"
        data-preferred-date="2024-01-15">
  Schedule Test Drive
</button>

<!-- Financing calculator -->
<button data-track-event="calculate_financing"
        data-vehicle-id="V123456"
        data-vehicle-price="25000"
        data-down-payment="5000"
        data-loan-term="60">
  Calculate Payment
</button>

<!-- Request quote -->
<button data-track-event="request_quote"
        data-vehicle-id="V123456"
        data-quote-type="trade-in"
        data-lead-source="website">
  Get Quote
</button>

<!-- Add to favorites -->
<button data-track-event="add_to_favorites"
        data-vehicle-id="V123456"
        data-user-id="U456789">
  ❤️ Save Vehicle
</button>

<!-- Location view -->
<div data-track-event="view_vehicle_location"
     data-vehicle-id="V123456"
     data-dealer-id="D789"
     data-location="New York, NY">
  View Location
</div>
```

#### Analytics Dashboard Examples

```html
<!-- Analytics dashboard -->
<div data-track-event="analytics_dashboard_view"
     data-dashboard-type="vehicle-analytics"
     data-date-range="last-30-days">
  <h1>Vehicle Analytics Dashboard</h1>
</div>

<!-- Export analytics -->
<button data-track-event="export_analytics"
        data-export-format="excel"
        data-date-range="last-30-days"
        data-metrics="views,leads,conversions">
  Export Data
</button>

<!-- Share analytics -->
<button data-track-event="share_analytics"
        data-share-method="email"
        data-recipients="team@dealer.com">
  Share Report
</button>
```

#### Chat Integration Examples

```html
<!-- Vehicle-specific chat -->
<button data-track-event="chat_ask_about_vehicle"
        data-vehicle-id="V123456"
        data-chat-topic="specifications"
        data-chat-source="vehicle-detail">
  Ask About This Vehicle
</button>

<!-- Financing chat -->
<button data-track-event="chat_request_financing"
        data-vehicle-id="V123456"
        data-financing-type="loan"
        data-chat-source="calculator">
  Chat About Financing
</button>

<!-- Schedule viewing via chat -->
<button data-track-event="chat_schedule_viewing"
        data-vehicle-id="V123456"
        data-viewing-type="test-drive"
        data-chat-source="vehicle-detail">
  Schedule via Chat
</button>
```

### Enable DOM Tracking

```javascript
// Tracking is enabled automatically, but you can also activate it manually:
window.guiders.enableDOMTracking();
```

## Custom Tracking

### Sending Custom Events

```javascript
// Basic event
await window.guiders.track({
  event: 'custom_event',
  user_id: '12345',
  action: 'button_click',
  value: 100
});

// Event with additional metadata
await window.guiders.track({
  event: 'newsletter_signup',
  email: 'user@example.com',
  source: 'footer_form',
  timestamp: Date.now()
});

// Vehicle-specific custom events
await window.guiders.track({
  event: 'vehicle_viewed',
  vehicle_id: 'V123456',
  vehicle_brand: 'Toyota',
  vehicle_model: 'Corolla',
  vehicle_year: 2024,
  vehicle_price: 25000,
  view_duration: 45,
  user_interest_score: 8.5
});

// Complex automotive events
await window.guiders.track({
  event: 'financing_calculated',
  vehicle_id: 'V123456',
  loan_amount: 20000,
  down_payment: 5000,
  interest_rate: 4.5,
  loan_term: 60,
  monthly_payment: 372.86,
  calculator_source: 'vehicle_detail_page'
});
```

### Event Management

```javascript
// Listen to events
window.guiders.on('receive-message', (message) => {
  console.log('Message received:', message);
});

// Listen to event once
window.guiders.once('visitor:open-chat', (event) => {
  console.log('Chat opened for the first time');
});

// Stop listening to events
function messageHandler(msg) {
  console.log('Message handler:', msg);
}
window.guiders.on('receive-message', messageHandler);
window.guiders.off('receive-message', messageHandler);

// Vehicle-specific event listeners
window.guiders.on('vehicle:comparison-updated', (data) => {
  console.log('Comparison updated:', data.vehicles.length, 'vehicles');
});

window.guiders.on('analytics:dashboard-view', (data) => {
  console.log('Analytics viewed:', data.metrics);
});
```

### Data Sending Control

```javascript
// Immediate manual sending
await window.guiders.flush();

// Stop automatic sending
window.guiders.stopAutoFlush();

// Add metadata to specific events
window.guiders.setMetadata('purchase', {
  affiliate_id: 'AFF123',
  campaign: 'black_friday_2024'
});

// Vehicle-specific metadata
window.guiders.setMetadata('vehicle_interaction', {
  dealer_id: 'D789',
  sales_rep: 'John Doe',
  lead_source: 'website',
  utm_campaign: 'summer_sale_2024'
});
```

## Advanced Configuration

### Custom Event Handlers

```javascript
// Configure custom handlers for specific events
window.guiders.configure({
  handlers: {
    'add_to_comparison': (data) => {
      // Custom logic when vehicle is added to comparison
      updateComparisonUI(data.vehicle_id);
      showComparisonToast(`${data.vehicle_brand} ${data.vehicle_model} added to comparison`);
    },
    'calculate_financing': (data) => {
      // Track financing calculations for lead scoring
      updateLeadScore(data.user_id, 'financing_interest');
      triggerRetargetingPixel(data);
    },
    'contact_dealer': (data) => {
      // Generate immediate lead notification
      notifyDealer(data.dealer_id, data.vehicle_id, data.contact_method);
    }
  }
});
```

### Real-time Analytics Integration

```javascript
// Configure real-time analytics updates
window.guiders.configure({
  realTimeAnalytics: {
    enabled: true,
    updateInterval: 5000, // 5 seconds
    metrics: ['vehicle_views', 'leads_generated', 'test_drives_scheduled'],
    dashboard: '#analytics-dashboard'
  }
});

// Listen to real-time updates
window.guiders.on('analytics:update', (metrics) => {
  updateDashboardMetrics(metrics);
});
```

### A/B Testing Integration

```javascript
// Configure A/B testing for automotive features
window.guiders.configure({
  abTesting: {
    enabled: true,
    experiments: {
      'vehicle_comparison_layout': {
        variants: ['side-by-side', 'tabbed', 'modal'],
        traffic_split: [40, 40, 20]
      },
      'financing_calculator_position': {
        variants: ['top', 'sidebar', 'bottom'],
        traffic_split: [33, 33, 34]
      }
    }
  }
});

// Track A/B test events
await window.guiders.track({
  event: 'ab_test_view',
  experiment: 'vehicle_comparison_layout',
  variant: 'side-by-side',
  user_id: 'U123456'
});
```

## Bot Detection

The SDK includes automatic bot detection to avoid tracking crawlers and bots. The detection analyzes:

- Browser User Agent
- Browser characteristics (plugins, webdriver, etc.)
- Page load times
- User interaction behavior

### Custom Configuration

```javascript
import { BotDetector } from 'guiders-pixel';

const detector = new BotDetector();
detector.detect().then(result => {
  The SDK includes advanced bot detection to ensure data quality:

### Basic Bot Detection

```javascript
import { BotDetector } from 'guiders-pixel';

const detector = new BotDetector();
detector.detect().then(result => {
  console.log('Is bot?:', result.isBot);
  console.log('Probability:', result.probability);
  console.log('Details:', result.details);
  
  if (!result.isBot) {
    initializeSDK();
  }
});
```

### Custom Thresholds

```javascript
detector.detect().then(result => {
  console.log('Is bot?:', result.isBot);
  console.log('Probability:', result.probability);
  console.log('Details:', result.details);
  
  if (result.probability < 0.3) {
    // More permissive custom threshold
    initializeSDK();
  }
});
```

### Detection Criteria

The bot detector analyzes multiple factors:

- **User Agent Analysis**: Known bot patterns and signatures
- **Behavior Patterns**: Mouse movement, click patterns, timing
- **Browser Features**: WebGL, canvas fingerprinting, feature detection
- **Network Analysis**: Request patterns and timing
- **Environment Detection**: Headless browsers, automation tools

### Automotive-Specific Bot Protection

```javascript
// Configure bot detection for automotive sites
window.guiders.configure({
  botDetection: {
    enabled: true,
    automotive: {
      // Protect high-value interactions
      protectedEvents: [
        'schedule_test_drive',
        'contact_dealer', 
        'request_quote',
        'calculate_financing'
      ],
      // Enhanced validation for lead generation
      leadValidation: true,
      // Block suspicious vehicle searches
      searchProtection: true
    }
  }
});
```
```

## Live Chat

The SDK includes integrated live chat functionality:

### Chat Features

- Lazy initialization (no flickering)
- Deferred content loading
- Unread message notifications
- Real-time WebSocket
- Automatic typing detection

### Chat Events

```javascript
// Chat is automatically initialized and hidden by default
// Events are tracked automatically:

// - visitor:open-chat: When user opens chat
// - visitor:close-chat: When user closes chat  
// - visitor:send-message: When user sends a message
// - receive-message: When receiving a message from advisor
```

### Chat Customization

```javascript
// Add system messages
window.addEventListener('add-system-message', (event) => {
  console.log('System message:', event.detail.message);
});

// Listen to chat open/close
window.guiders.on('visitor:open-chat', (event) => {
  console.log('Chat opened:', event.data);
});

window.guiders.on('visitor:close-chat', (event) => {
  console.log('Chat closed:', event.data);
});
```

## Processing Pipeline

The SDK uses a pipeline system to process events:

```javascript
// Add custom stages to the pipeline
window.guiders.addPipelineStage({
  name: 'custom-validator',
  process: (event) => {
    // Custom validation
    if (event.type === 'purchase' && !event.data.order_id) {
      throw new Error('order_id is required for purchase events');
    }
    return event;
  }
});
```

## Complete Examples

### Basic E-commerce

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <!-- Automatic page tracking -->
  <div data-track-event="page_view" 
       data-page-title="Product Catalog"
       data-page-category="shop"></div>

  <!-- Product -->
  <div class="product" 
       data-track-event="view_product"
       data-product-id="PROD-001"
       data-product-name="Smartphone XYZ"
       data-price="299.99"
       data-category="Electronics">
    
    <h2>Smartphone XYZ</h2>
    <p>Price: €299.99</p>
    
    <button data-track-event="add_to_cart"
            data-product-id="PROD-001"
            data-price="299.99"
            data-quantity="1">
      Add to Cart
    </button>
  </div>

  <!-- Cart -->
  <div data-track-event="view_cart"
       data-cart-value="299.99"
       data-items-count="1">
    <h3>Your Cart</h3>
    <p>Total: €299.99</p>
    
    <button data-track-event="purchase"
            data-order-id="ORD-789"
            data-total="299.99"
            data-currency="EUR"
            data-payment-method="credit_card">
      Complete Purchase
    </button>
  </div>

  <!-- SDK Integration -->
  <script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" 
          data-api-key="your-api-key-here"></script>
</body>
</html>
```

### Automotive Dealership Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>AutoDealer Pro - Vehicle Search</title>
</head>
<body>
  <!-- Vehicle Search Page -->
  <div data-track-event="page_view" 
       data-page-title="Vehicle Search"
       data-page-category="automotive"
       data-dealer-id="DEALER-123">
    
    <!-- Search Form -->
    <form class="vehicle-search">
      <select data-track-event="search_vehicle_type" 
              data-search-context="main-search">
        <option value="">Vehicle Type</option>
        <option value="new">New Vehicles</option>
        <option value="used">Used Vehicles</option>
        <option value="certified">Certified Pre-Owned</option>
      </select>

      <select data-track-event="search_brand" 
              data-search-context="main-search">
        <option value="">Brand</option>
        <option value="toyota">Toyota</option>
        <option value="honda">Honda</option>
        <option value="ford">Ford</option>
      </select>

      <input type="text" 
             data-track-event="search_input" 
             data-search-type="vehicle"
             placeholder="Search by model, features...">

      <button type="submit" 
              data-track-event="search_submit"
              data-search-type="vehicle">
        Search Vehicles
      </button>
    </form>

    <!-- Advanced Filters -->
    <div class="filters">
      <button data-track-event="toggle_advanced_filters"
              data-filters-visible="false">
        Advanced Filters
      </button>
      
      <div class="advanced-filters" style="display: none;">
        <input type="range" 
               data-track-event="filter_by_price"
               data-filter-type="price"
               min="0" max="100000"
               placeholder="Max Price">
        
        <select data-track-event="filter_by_year"
                data-filter-category="specifications">
          <option value="">Year</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
      </div>
    </div>

    <!-- Vehicle Results -->
    <div class="vehicle-results">
      <div class="sort-controls">
        <select data-track-event="sort_vehicles" 
                data-results-count="24">
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="year_desc">Newest First</option>
        </select>
      </div>

      <!-- Vehicle Card -->
      <div class="vehicle-card" 
           data-track-event="view_vehicle_details"
           data-vehicle-id="V123456"
           data-vehicle-brand="Toyota"
           data-vehicle-model="Corolla"
           data-vehicle-year="2024"
           data-vehicle-price="25000"
           data-dealer-id="DEALER-123">
        
        <img data-track-event="view_vehicle_gallery"
             data-vehicle-id="V123456"
             data-images-count="15"
             src="corolla-2024.jpg" 
             alt="2024 Toyota Corolla">
        
        <h3>2024 Toyota Corolla</h3>
        <p class="price">$25,000</p>
        
        <div class="vehicle-actions">
          <button data-track-event="add_to_comparison"
                  data-vehicle-id="V123456"
                  data-vehicle-brand="Toyota"
                  data-vehicle-model="Corolla"
                  data-vehicle-year="2024"
                  data-vehicle-price="25000">
            Compare
          </button>
          
          <button data-track-event="contact_dealer"
                  data-vehicle-id="V123456"
                  data-dealer-id="DEALER-123"
                  data-contact-method="phone">
            Call Dealer
          </button>
          
          <button data-track-event="schedule_test_drive"
                  data-vehicle-id="V123456"
                  data-dealer-id="DEALER-123">
            Test Drive
          </button>
          
          <button data-track-event="calculate_financing"
                  data-vehicle-id="V123456"
                  data-vehicle-price="25000">
            Calculate Payment
          </button>
        </div>
      </div>
    </div>

    <!-- Vehicle Comparison Panel -->
    <div class="comparison-panel" 
         data-track-event="view_vehicle_comparison"
         data-vehicles-count="0"
         style="display: none;">
      <h4>Vehicle Comparison (0)</h4>
      
      <div class="comparison-actions">
        <button data-track-event="export_comparison"
                data-export-format="pdf">
          Export PDF
        </button>
        
        <button data-track-event="save_comparison"
                data-comparison-name="My Comparison">
          Save Comparison
        </button>
        
        <button data-track-event="clear_comparison">
          Clear All
        </button>
      </div>
    </div>

    <!-- Analytics Dashboard Widget -->
    <div class="dashboard-widget" 
         data-track-event="analytics_dashboard_view"
         data-dashboard-type="dealer-summary">
      <h4>Today's Activity</h4>
      <p>Vehicle Views: <span id="vehicle-views">0</span></p>
      <p>Test Drives: <span id="test-drives">0</span></p>
      <p>Quotes Requested: <span id="quotes">0</span></p>
      
      <button data-track-event="export_analytics"
              data-export-format="excel"
              data-date-range="today">
        Export Report
      </button>
    </div>

    <!-- Chat Integration -->
    <div class="chat-triggers">
      <button data-track-event="chat_ask_about_vehicle"
              data-vehicle-id="V123456"
              data-chat-topic="general"
              data-chat-source="search-page">
        Ask About Vehicles
      </button>
      
      <button data-track-event="chat_request_financing"
              data-financing-type="auto-loan"
              data-chat-source="search-page">
        Financing Help
      </button>
    </div>
  </div>

  <!-- SDK Integration with Automotive Configuration -->
  <script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" 
          data-api-key="your-automotive-api-key"></script>
  
  <script>
    // Configure for automotive use case
    window.addEventListener('DOMContentLoaded', function() {
      if (window.guiders) {
        // Configure automotive-specific settings
        window.guiders.configure({
          automotive: {
            dealerId: 'DEALER-123',
            leadScoring: true,
            comparisonTracking: true,
            testDriveTracking: true
          },
          realTimeAnalytics: {
            enabled: true,
            updateInterval: 5000,
            metrics: ['vehicle_views', 'test_drives_scheduled', 'quotes_requested']
          }
        });

        // Listen to automotive events
        window.guiders.on('vehicle:added-to-comparison', function(data) {
          updateComparisonCounter(data.count);
        });

        window.guiders.on('analytics:update', function(metrics) {
          document.getElementById('vehicle-views').textContent = metrics.vehicle_views || 0;
          document.getElementById('test-drives').textContent = metrics.test_drives || 0;
          document.getElementById('quotes').textContent = metrics.quotes || 0;
        });
      }
    });
  </script>
</body>
</html>
```

## Best Practices

### Performance Optimization

1. **Lazy Loading**: The SDK loads asynchronously to avoid blocking page rendering
2. **Event Batching**: Events are batched and sent in intervals to reduce server requests
3. **Error Handling**: Failed events are automatically retried with exponential backoff

### Data Quality

1. **Bot Detection**: Enable bot detection for high-value interactions
2. **Event Validation**: Validate required fields before sending events
3. **User Consent**: Respect GDPR and privacy regulations

### Automotive-Specific Tips

1. **Lead Quality**: Use bot detection for lead generation events
2. **Vehicle Attribution**: Always include vehicle_id for tracking specific inventory
3. **Dealer Context**: Include dealer_id for multi-location dealerships
4. **Comparison Tracking**: Track vehicle comparisons to understand customer preferences
5. **Real-time Analytics**: Use real-time updates for sales dashboard and lead management

## Troubleshooting

### Common Issues

1. **Events not appearing**: Check console for errors and verify API key
2. **High bot traffic**: Enable bot detection and adjust thresholds
3. **Missing vehicle data**: Ensure all required vehicle attributes are included
4. **Chat not loading**: Check WebSocket connection and firewall settings

### Debug Mode

```javascript
// Enable debug mode for troubleshooting
window.guiders.configure({
  debug: true,
  logLevel: 'verbose'
});
```

This will log all events and API calls to the browser console for debugging purposes.
</html>
```

### Advanced Integration

```javascript
// Complete configuration with error handling
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

    // Check if it's a bot
    const detector = new BotDetector();
    const detection = await detector.detect();
    
    if (detection.isBot) {
      console.log('Bot detected, tracking not initialized');
      return;
    }

    // Initialize SDK
    const sdk = new TrackingPixelSDK(options);
    window.guiders = sdk;
    
    await sdk.init();
    sdk.enableDOMTracking();

    // Custom tracking
    await sdk.track({
      event: 'page_load',
      page: window.location.pathname,
      referrer: document.referrer,
      timestamp: Date.now()
    });

    console.log('Guiders SDK initialized successfully');
    
  } catch (error) {
    console.error('Error initializing Guiders SDK:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGuiders);
} else {
  initializeGuiders();
}
```

## Troubleshooting

### Common Issues

1. **SDK doesn't initialize**
   - Verify that the API key is correct
   - Check server connection
   - Review if incorrectly detected as bot

2. **Events don't send**
   - Verify that `autoFlush` is enabled
   - Check `flushInterval` configuration
   - Review browser console for errors

3. **Chat doesn't appear**
   - Chat is hidden by default until user activates it
   - Verify WebSocket connection
   - Check that tokens are valid

### Debugging

```javascript
// Enable detailed logs
console.log('SDK state:', {
  hasValidTokens: TokenManager.hasValidTokens(),
  isConnected: window.guiders.isConnected?.(),
  eventQueue: window.guiders.eventQueue?.length
});

// Verify bot detection
const detector = new BotDetector();
detector.detect().then(result => {
  console.log('Bot detection:', result);
});
```

## Support

For technical support or to report issues:

1. Review the complete documentation
2. Verify API key configuration
3. Check browser console for errors
4. Contact support team with specific problem details

---

## Versioning

Current version: 1.0.5

## Visitor Session Management (Visitors API V2)

The SDK now relies exclusively on Visitors API V2 for identity & backend session lifecycle. Legacy endpoints like `/visitor/me` are removed.

### Initialization Flow
1. Generate or load persistent `fingerprint`.
2. Obtain internal tokens (`ensureTokens`).
3. `POST /visitors/identify` with `{ fingerprint }` (creates/updates visitor and opens backend session via HttpOnly cookie).
4. Preload up to 20 recent chats (`GET /v2/chats/visitor/:visitorId`).
5. Start backend heartbeat every 30s (`POST /visitors/session/heartbeat`).
6. Start local advanced session tracking (emits `session_start`, `user_idle`, `user_resume`, `session_end`).

### Endpoints (no fallbacks)
| Operation | Endpoint | Method | Notes |
|-----------|----------|--------|-------|
| Identify visitor | `/visitors/identify` | POST | Returns `visitorId` and optional `sessionId` (stored in `sessionStorage`). |
| Heartbeat | `/visitors/session/heartbeat` | POST | Keeps backend session alive (30s interval). |
| Explicit end | `/visitors/session/end` | POST | Called in `cleanup()` and `beforeunload` (beacon). |

### Session Tracking Internal Events
| Event | Description |
|-------|-------------|
| `session_start` | New logical browser session. |
| `user_idle` | User inactive beyond `maxInactivityTime` (default 60s). |
| `user_resume` | User returns from idle. |
| `session_reactivate` | Tab/page becomes active after being fully inactive. |
| `session_end` | Explicit end (cleanup) or final closure. |

### Page Unload Handling
On `beforeunload`:
1. Best-effort flush of pending events:
   - If WebSocket connected: send each event directly.
   - Else: `navigator.sendBeacon` → `POST /tracking/events/batch` (backend must implement this).
2. Send `endSession` using beacon (or fetch keepalive fallback).

### Heartbeat Customization
Currently fixed at 30s (backend) and 10s internal session loop. Open an issue if you need to expose a `visitorHeartbeatInterval` option.

### Migration Notes from V1
| V1 | Status in V2 |
|----|--------------|
| `/visitor/me` | Removed. Basic data comes from `identify`. |
| Extended profile via `visitor/me` | Extend `identify` response in backend if needed early. |
| Conditional chat reuse via fallback | Now always based on preloaded V2 chats. |

### Quick Re-identification Example
```javascript
import { VisitorsV2Service } from 'guiders-pixel/dist/services/visitors-v2-service';

async function reIdentify() {
  const fp = localStorage.getItem('fingerprint');
  if (!fp) return;
  const data = await VisitorsV2Service.getInstance().identify(fp);
  console.log('Re-identified:', data);
}
```

### Common Issues
| Issue | Likely Cause | Action |
|-------|--------------|--------|
| Backend session not created | Cookie blocked (SameSite / 3rd party context) | Review cookie flags & embedding context. |
| Heartbeat intermittent failures | Network hiccups / tab background throttling | Auto recovers; investigate >5 consecutive failures. |
| Lost events on close | Fast tab shutdown or missing batch endpoint | Implement `/tracking/events/batch` & monitor delivery metrics. |


For more information about changes and updates, check the project's README.md file.