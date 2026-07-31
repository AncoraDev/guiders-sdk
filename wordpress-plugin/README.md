# Plugin de WordPress para Guiders SDK

Este directorio contiene un plugin completo de WordPress que integra el SDK de Guiders para proporcionar tracking inteligente, chat en vivo y notificaciones en sitios WordPress.

## 🐳 Entorno Docker de desarrollo

En esta carpeta viven `docker-compose.yml` y `wp-docker.sh` (WordPress + MySQL + phpMyAdmin con el plugin montado).

```bash
# Desde la raíz del repo
./wordpress-plugin/wp-docker.sh start

# O desde aquí
./wp-docker.sh start
```

Guía completa: [`docs/wordpress/DOCKER_WORDPRESS.md`](../docs/wordpress/DOCKER_WORDPRESS.md).

## 🚀 Características

- **Detección Heurística Inteligente**: Detecta automáticamente elementos como botones "Añadir al carrito", formularios de contacto, etc. sin modificar HTML
- **Chat en Vivo**: Chat integrado con carga diferida y optimizado para WordPress
- **Tracking Automático**: Seguimiento de eventos automático compatible con WooCommerce
- **Panel de Administración**: Configuración completa desde el admin de WordPress
- **Compatible con Caché**: Funciona con WP Rocket y otros plugins de optimización
- **Detección de Bots**: Evita cargas innecesarias en bots y crawlers

## 📦 Instalación

### Opción 1: Copia Manual
1. Copia la carpeta `guiders-wp-plugin` a `/wp-content/plugins/` de tu WordPress
2. Ve a **Plugins** en el admin de WordPress
3. Activa **Guiders SDK**
4. Ve a **Configuración > Guiders SDK** para configurar

### Opción 2: ZIP para WordPress
1. Comprime la carpeta `guiders-wp-plugin` en un archivo ZIP
2. Ve a **Plugins > Añadir nuevo > Subir plugin**
3. Sube el archivo ZIP
4. Activa el plugin

## ⚙️ Configuración

1. **Obtén tu API Key**:
   - Regístrate en [Guiders](https://guiders.ancoradual.com)
   - Crea un proyecto
   - Copia la API Key

2. **Configura el Plugin**:
   - Ve a **Configuración > Guiders SDK**
   - Pega tu API Key
   - Habilita las características que necesites
   - Ajusta el umbral de confianza (0.7 recomendado)
   - Guarda los cambios

## 🛠️ Estructura del Plugin

```
guiders-wp-plugin/
├── guiders-wp-plugin.php          # Archivo principal del plugin
├── includes/
│   ├── class-guiders-admin.php    # Funcionalidad del admin
│   └── class-guiders-public.php   # Funcionalidad del frontend
├── admin/
│   └── partials/
│       └── admin-display.php      # Template de configuración
├── assets/
│   ├── js/
│   │   └── guiders-sdk.js         # SDK compilado
│   └── css/
│       └── admin-style.css        # Estilos del admin
└── readme.txt                     # Documentación para WordPress.org
```

## 🔧 Funcionalidades Técnicas

### Detección Automática
El plugin detecta automáticamente:
- Botones "Añadir al carrito" (WooCommerce)
- Enlaces de contacto
- Formularios de búsqueda
- Procesos de checkout
- Descargas de archivos
- Y muchos más...

### Integración con WooCommerce
- Tracking automático de eventos de ecommerce
- Compatibilidad con AJAX de WooCommerce
- Detección de productos y categorías
- Seguimiento de conversiones

### Optimización de Rendimiento
- Carga asíncrona del SDK
- Detección de bots para evitar cargas innecesarias
- Compatible con plugins de caché
- Preconnect headers para mejor performance

### Tienda Online (WooCommerce)

```php
// El plugin detecta automáticamente:
// - Botones "Añadir al carrito"
// - Proceso de checkout
// - Visualización de productos
// - Búsquedas de productos
```

### Sitio Corporativo

```php
// Detecta automáticamente:
// - Formularios de contacto
// - Enlaces de "Contactar"
// - Descargas de brochures
// - Páginas de servicios
```

### Blog/Revista

```php
// Tracking automático de:
// - Tiempo en página
// - Scroll depth
// - Clics en enlaces externos
// - Interacciones con comments
```

## 🔍 Personalización

### Hooks Disponibles

```php
// Filtrar configuración del SDK
add_filter('guiders_sdk_config', function($config) {
    $config['customOption'] = 'value';
    return $config;
});

// Modificar datos del usuario
add_filter('guiders_user_data', function($user_data) {
    $user_data['custom_field'] = 'value';
    return $user_data;
});
```

### Configuración Programática

```php
add_action('init', function() {
    if (function_exists('guiders_set_config')) {
        guiders_set_config(array(
            'api_key' => 'your-api-key',
            'enabled' => true,
            'confidence_threshold' => 0.8
        ));
    }
});
```

## 🚨 Troubleshooting

### El SDK no se carga

1. Verifica que la API Key esté configurada
2. Comprueba que el plugin esté habilitado
3. Revisa la consola del navegador para errores

### Chat no aparece

1. Verifica que el chat esté habilitado en configuración
2. Comprueba que no haya conflictos con el tema
3. Revisa que no esté bloqueado por adblock

### WooCommerce no funciona

1. Asegúrate de que WooCommerce esté activo
2. Verifica que jQuery esté cargado
3. Comprueba compatibilidad con tema de WooCommerce

## 📝 Desarrollo

### Requisitos

- WordPress 5.0+
- PHP 7.4+
- SDK de Guiders compilado

### Compilar SDK

```bash
cd /ruta/al/guiders-sdk
npm install
npm run build
cp dist/index.js wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.js
```

### Flujo de Release Automatizado

Scripts disponibles (ejecutar desde la raíz del monorepo):

```bash
npm run release:wp         # Build + genera ZIP guiders-wp-plugin-<version>.zip
npm run release:wp:skip    # Genera ZIP reutilizando build existente
npm run release:wp:publish # Build + ZIP + commit + tag + push (usa versión en cabecera del plugin)
```

Pasos internos de `release:wp:publish`:

1. Lee versión de `guiders-wp-plugin.php` (línea 'Version:').
2. Ejecuta build del SDK y copia `dist/index.js` → `assets/js/guiders-sdk.js`.
3. Genera ZIP `wordpress-plugin/guiders-wp-plugin-<version>.zip`.
4. Crea commit y tag `v<version>` (si no existe) y hace push.

Requisitos antes de publicar:

- Actualizar cabecera + constante `GUIDERS_WP_PLUGIN_VERSION`.
- Actualizar `Stable tag` y changelog en `readme.txt`.
- Verificar que no haya cambios pendientes inesperados (`git status`).

Tip: Para sólo regenerar el ZIP tras editar `readme.txt`, usa `npm run release:wp:skip`.

### Testing

```bash
# Instalar en entorno de testing de WordPress
wp plugin install /ruta/al/plugin --activate

# Verificar configuración
wp option get guiders_wp_plugin_settings
```

## 📚 Documentación Adicional

- [SDK de Guiders](https://github.com/RogerPugaRuiz/guiders-sdk)
- [Documentación API](https://guiders.ancoradual.com/docs)
- [Ejemplos de Integración](https://github.com/RogerPugaRuiz/guiders-sdk/examples)

## 🤝 Contribuir

1. Fork el repositorio principal
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Envía un pull request

## 📄 Licencia

ISC - La misma licencia que el SDK de Guiders.
