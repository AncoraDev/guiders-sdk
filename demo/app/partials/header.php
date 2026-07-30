
<!-- partials/header.php -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guiders SDK - Solución Integral de Análisis Web</title>
  <meta name="description" content="Guiders SDK: Seguimiento avanzado, análisis en tiempo real y chat integrado para aplicaciones web modernas.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
  
  <!-- Configuración de Guiders SDK -->
  <script>
    window.GUIDERS_CONFIG = {
      apiKey: '4ebaa025c7da6277e77521c97e59a92a085b538c01c5c75b84348870dcb55eb8',
      environment: 'development',
      dev: true,
      endpoint: 'http://localhost:3000/api',
      webSocketEndpoint: 'ws://localhost:3000',
      requireConsent: false, // ✅ Consentimiento DESACTIVADO - SDK funciona sin barreras GDPR
      consentBanner: {
        enabled: false        // ✅ Banner de consentimiento DESACTIVADO
      },
      autoFlush: true,        // ✅ IMPORTANTE: Habilitar envío automático de eventos
      flushInterval: 5000,    // Enviar eventos cada 5 segundos
      autoOpenChatOnMessage: true, // ✅ Auto-abrir chat cuando comercial envía mensaje
      // theme: 'carbon',            // 🎨 Theme: 'default' | 'carbon'
      chatConsentMessage: {
        enabled: false,  // ✅ DESACTIVADO para desarrollo
        message: 'Al unirte al chat, confirmas que has leído y entiendes nuestra',
        privacyPolicyUrl: '/privacy-policy',
        privacyPolicyText: 'Política de Privacidad',
        cookiesPolicyUrl: '/cookies-policy',
        cookiesPolicyText: 'Política de Cookies',
        showOnce: true
      },
      activeHours: {
        enabled: false,
        timezone: 'Europe/Madrid',
        ranges: [
          { start: '08:00', end: '17:00' }
        ],
        fallbackMessage: '🕐 Nuestro chat está disponible de 8:00-17:00 (hora de Madrid). ¡Vuelve durante nuestros horarios de atención!'
      },
      commercialAvailability: {
        enabled: false,         // ✅ DESACTIVADO para desarrollo (puede ocultar chat)
        pollingInterval: 10,    // Consultar cada 10 segundos (rápido para demo)
        showBadge: true,        // Mostrar número de comerciales disponibles
        debug: true             // Habilitar logs de debug
      },
      trackingV2: {
        enabled: true,          // Habilitar tracking V2
        batchSize: 500,         // Tamaño del batch
        flushInterval: 5000,    // Flush cada 5 segundos
        maxQueueSize: 10000,    // Tamaño máximo de cola
        persistQueue: true,     // Persistir en localStorage
        bypassConsent: true,    // ✅ BYPASS CONSENT ACTIVADO (Solo desarrollo - NUNCA en producción)
        throttling: {
          enabled: true,
          rules: {
            'SCROLL': 100,        // Max 10 eventos/segundo
            'MOUSE_MOVE': 50,     // Max 20 eventos/segundo
            'HOVER': 200,         // Max 5 eventos/segundo
            'RESIZE': 300,        // Max ~3 eventos/segundo
            'MOUSE_ENTER': 150,
            'MOUSE_LEAVE': 150
          },
          debug: true             // Ver eventos throttled en consola
        },
        aggregation: {
          enabled: true,
          windowMs: 1000,         // Ventana de agregación de 1 segundo
          maxBufferSize: 1000,    // Flush forzado si buffer lleno
          debug: true             // Ver eventos agregados en consola
        }
      },
      presence: {
        enabled: true,                  // Habilitar sistema de presencia
        showTypingIndicator: true,      // Mostrar indicadores de escritura
        typingDebounce: 300,            // Delay antes de enviar "escribiendo" (ms)
        typingTimeout: 2000,            // Auto-stop después de inactividad (ms)
        pollingInterval: 30000,         // Consultar presencia cada 30s (fallback REST API)
        showOfflineBanner: true,        // Mostrar banner cuando comercial está offline
        // 🆕 2025: Sistema optimizado
        // - Auto-join automático a sala personal (visitor:{id})
        // - Eventos filtrados: solo recibes presencia del comercial asignado a tu chat
        // - Heartbeat automático cada 30s para mantener estado online
        // - Detección automática: 5 min → away, 15 min → offline
      },
      // 🆕 Quick Actions - Botones de acción rápida en el chat
      quickActions: {
        enabled: true,
        welcomeMessage: '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
        showOnFirstOpen: true,
        showOnChatStart: true,
        buttons: [
          {
            id: 'greet',
            label: 'Saludar',
            emoji: '👋',
            action: { type: 'send_message', payload: '¡Hola! Me gustaría obtener más información.' }
          },
          {
            id: 'pricing',
            label: 'Ver precios',
            emoji: '💰',
            action: { type: 'send_message', payload: '¿Cuáles son sus planes y precios?' }
          },
          {
            id: 'agent',
            label: 'Hablar con persona',
            emoji: '👤',
            action: { type: 'request_agent' }
          },
          {
            id: 'help',
            label: 'Centro de ayuda',
            emoji: '📚',
            action: { type: 'open_url', payload: 'https://help.guiders.app' }
          }
        ]
      }
    };

    // Generar session ID único
    (function() {
      if (!sessionStorage.getItem('uniqueSessionId')) {
        const uniqueSessionId = 'sess-' + Math.random().toString(36).substr(2, 16) + '-' + Date.now();
        sessionStorage.setItem('uniqueSessionId', uniqueSessionId);
      }
    })();
  </script>

  <!--
    Guiders SDK Script — auto-fallback strategy:
      1. If webpack-dev-server is reachable at 127.0.0.1:8081 (developer ran
         `npm start`), load the live bundle for hot reload.
      2. Otherwise, fall back to the static `guiders-sdk.js` copied into
         demo/app/ by `npm run build && cp dist/index.js demo/app/...`.
    This keeps the dev workflow snappy AND lets E2E tests run without
    requiring webpack-dev-server to be up.
  -->
  <?php
    $guidersDevSrc  = 'http://127.0.0.1:8081/index.js?dev=true';
    $guidersStaticSrc = '/guiders-sdk.js?v=' . time();
    $guidersApiKey  = '12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0';
    // Probe webpack-dev-server with a 250ms timeout so the page never stalls.
    $ctx = stream_context_create(['http' => ['timeout' => 0.25, 'method' => 'HEAD']]);
    $devUp = @file_get_contents('http://127.0.0.1:8081/index.js', false, $ctx);
    $guidersSrc = ($devUp !== false) ? $guidersDevSrc : $guidersStaticSrc;
  ?>
  <script src="<?php echo $guidersSrc; ?>" data-api-key="<?php echo $guidersApiKey; ?>"></script>

  <!-- Producción (S3): -->
  <!-- <script src="https://guiders-sdk.s3.eu-north-1.amazonaws.com/0.0.1/index.js" data-api-key="ea0cb2d33e9a186906747071e88a1a1eb1c219a0189f0344c7d87e2c497bf626"></script> -->
</head>
<body>
  <?php
  // ✅ BANNER GDPR DESACTIVADO - No se requiere consentimiento en modo desarrollo
  // require_once __DIR__ . '/gdpr-banner.php';
  ?>