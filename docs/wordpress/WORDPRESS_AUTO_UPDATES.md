# 🔄 Sistema de Actualizaciones Automáticas - Plugin WordPress

## Resumen

El plugin de Guiders SDK ahora incluye un **sistema de actualizaciones automáticas** que permite a los usuarios recibir y aplicar actualizaciones directamente desde el panel de WordPress, sin necesidad de descargar manualmente los archivos.

## ✨ Cómo Funciona

### 1. **Verificación Automática**
- WordPress verifica actualizaciones cada 12 horas automáticamente
- El plugin consulta la **GitHub Releases API** para obtener la última versión
- Se compara la versión instalada vs. la disponible

### 2. **Notificación en WordPress**
- Si hay una nueva versión, aparece un **badge naranja** en el menú Plugins
- Se muestra información de la actualización disponible
- Enlace directo para actualizar con un clic

### 3. **Instalación Automática**
- WordPress descarga el ZIP desde GitHub Releases
- Reemplaza los archivos del plugin automáticamente
- Mantiene la configuración del usuario intacta

## 🛠️ Componentes Técnicos

### `GuidersUpdater` (class-guiders-updater.php)

**Hooks principales:**
- `pre_set_site_transient_update_plugins` - Verificar actualizaciones
- `plugins_api` - Popup de información del plugin
- `upgrader_process_complete` - Post-actualización

**Funcionalidades:**
- ✅ Cache de 6 horas para verificaciones de versión
- ✅ Descarga automática desde GitHub Releases
- ✅ Soporte para versiones alpha/beta (pre-releases)
- ✅ Validación de assets (busca `guiders-wp-plugin-*.zip`)
- ✅ Manejo de errores y logging

### Configuración

```php
// Repositorio GitHub
const GITHUB_REPO = 'RogerPugaRuiz/guiders-sdk';

// API Endpoint
const GITHUB_API_URL = 'https://api.github.com/repos/RogerPugaRuiz/guiders-sdk/releases';

// Cache key
private $update_transient_key = 'guiders_wp_plugin_update_check';
```

## 📋 Requisitos de Release

Para que el sistema funcione correctamente, cada **GitHub Release** debe:

1. **Tag con formato semver**: `v1.0.4-alpha.11`, `v1.2.0`, etc.
2. **Asset ZIP**: Archivo `guiders-wp-plugin-{version}.zip` adjunto
3. **No ser draft**: El release debe estar publicado
4. **Estable vs Pre-release**: 
   - Versiones estables (sin sufijos) = releases normales
   - Versiones alpha/beta/rc = pre-releases en GitHub

## 🎯 Flujo de Usuario

### En el Admin de WordPress:

1. **Panel de Control**: Badge de notificación si hay actualizaciones
2. **Página de Plugins**: 
   - Mensaje "Hay una nueva versión disponible"
   - Botón "Actualizar ahora"
   - Enlace "Ver detalles de la versión"
3. **Página de Configuración**: 
   - Estado actual de la versión
   - Botón "Verificar actualizaciones" manual
   - Información sobre actualizaciones automáticas

### Proceso de Actualización:

```
Usuario hace clic en "Actualizar ahora"
    ↓
WordPress descarga el ZIP desde GitHub
    ↓
Descomprime y reemplaza archivos del plugin
    ↓
Mantiene configuración del usuario
    ↓
Plugin actualizado - Ready!
```

## 🔧 Configuración de Desarrollo

### Para Testing:

```php
// Forzar verificación de actualización (para debugging)
delete_transient('guiders_wp_plugin_update_check');
wp_update_plugins();
```

### Verificación Manual:

1. Ir a **Plugins → Plugins instalados**
2. Hacer clic en "Verificar actualizaciones" (arriba de la tabla)
3. O añadir `?force-check=1` a la URL

## 📊 Características Avanzadas

### ✅ **Cache Inteligente**
- 6 horas de cache para evitar spam a GitHub API
- Se limpia automáticamente tras actualización exitosa
- Verificación manual force-bypass del cache

### ✅ **Manejo de Errores**
- Logs en WordPress error log
- Fallback graceful si GitHub API falla
- No bloquea funcionamiento normal del plugin

### ✅ **Información Detallada**
- Popup con changelog de la nueva versión
- Compatibilidad con WordPress y PHP
- Enlaces a documentación y soporte

### ✅ **Soporte Multi-Versión**
- Detección automática de versiones estables vs pre-release
- Los usuarios reciben solo versiones estables por defecto
- Desarrolladores pueden acceder a alphas/betas

## 🚀 Beneficios

### Para Usuarios:
- ✅ **Actualizaciones con un clic** - Como cualquier plugin del repositorio oficial
- ✅ **Notificaciones automáticas** - Se enteran cuando hay nuevas versiones
- ✅ **Configuración preservada** - No pierden su API key ni ajustes
- ✅ **Proceso familiar** - Misma interfaz que otros plugins de WordPress

### Para Desarrolladores:
- ✅ **Distribución automática** - Solo necesitan crear GitHub Releases
- ✅ **Control de versiones** - Semver estricto y pre-releases
- ✅ **Estadísticas implícitas** - Requests a GitHub API = adopción
- ✅ **Rollback sencillo** - WordPress mantiene backup automático

## 🔄 Flujo de Release

1. **Desarrollo**: Código listo en rama `main`
2. **Versioning**: Actualizar version en plugin header y readme.txt
3. **Build**: Ejecutar `npm run release:wp:publish "mensaje"`
4. **GitHub Actions**: Automáticamente crea GitHub Release con ZIP
5. **WordPress**: Usuarios reciben notificación de actualización automáticamente

## 🛡️ Seguridad

- **Verificación de integridad**: WordPress valida el ZIP descargado
- **Permisos**: Solo usuarios con `manage_options` pueden actualizar
- **Backup automático**: WordPress crea backup antes de actualizar
- **Rollback**: Posible restaurar versión anterior desde backup

## 📝 Notas de Implementación

### Hooks WordPress Utilizados:

```php
// Verificar actualizaciones
add_filter('pre_set_site_transient_update_plugins', 'checkForUpdate');

// Información del plugin (popup)
add_filter('plugins_api', 'pluginInfoPopup', 10, 3);

// Post-actualización
add_action('upgrader_process_complete', 'afterUpdate', 10, 2);

// Limpiar cache manualmente
add_action('load-update-plugins.php', 'clearUpdateTransient');
```

### Estructura de Respuesta GitHub:

```json
{
  "tag_name": "v1.0.4-alpha.11",
  "name": "Release 1.0.4-alpha.11",
  "body": "## Changelog\n- Feature X\n- Bug fix Y",
  "draft": false,
  "prerelease": true,
  "assets": [
    {
      "name": "guiders-wp-plugin-1.0.4-alpha.11.zip",
      "browser_download_url": "https://github.com/.../releases/download/.../guiders-wp-plugin-1.0.4-alpha.11.zip"
    }
  ]
}
```

## 🎉 Resultado Final

Los usuarios del plugin ahora pueden:

1. **Recibir notificaciones** cuando hay nuevas versiones
2. **Actualizar con un clic** desde el panel de WordPress
3. **Ver información detallada** sobre cada actualización
4. **Mantener su configuración** intacta durante las actualizaciones
5. **Verificar manualmente** si hay actualizaciones disponibles

El sistema está **completamente integrado** con la experiencia nativa de WordPress, haciendo que las actualizaciones del plugin Guiders SDK sean tan sencillas como cualquier otro plugin oficial del repositorio.