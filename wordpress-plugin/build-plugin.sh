#!/bin/bash

# Script para crear un ZIP distribuible del plugin de WordPress
# Uso: ./build-plugin.sh [--skip-build]
# Debe ejecutarse desde el directorio raíz del proyecto guiders-sdk

set -euo pipefail

SKIP_BUILD=false
if [[ "${1:-}" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

echo "🚀 Creando plugin de WordPress para Guiders SDK..."

if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio raíz de guiders-sdk"
    exit 1
fi

PLUGIN_MAIN="wordpress-plugin/guiders-wp-plugin/guiders-wp-plugin.php"
if [ ! -f "$PLUGIN_MAIN" ]; then
    echo "❌ No se encuentra $PLUGIN_MAIN"
    exit 1
fi

# Obtener versión desde la cabecera del plugin
PLUGIN_VERSION=$(grep -i -m1 "^ \* Version:" "$PLUGIN_MAIN" | sed -E 's/^ \* Version:[[:space:]]*//I')
if [[ -z "$PLUGIN_VERSION" ]]; then
    echo "❌ No se pudo extraer la versión del plugin"
    exit 1
fi

echo "ℹ️  Versión detectada: $PLUGIN_VERSION"

if ! $SKIP_BUILD; then
    echo "📦 Compilando SDK (npm run build)..."
    npm run build
else
    echo "⏭  Omitiendo build (flag --skip-build)"
fi

if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: No existe dist/index.js tras build"
    exit 1
fi

echo "📋 Copiando SDK al plugin..."
cp dist/index.js wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.min.js

MIN_JS="wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.min.js"
if grep -q 'webpack-dev-server\|webpackHotUpdate\|webpack/hot' "$MIN_JS"; then
    echo "❌ ERROR: $MIN_JS es un bundle de webpack-dev-server (HMR)."
    echo "   Ese cliente llama location.reload() ~cada 1s en sitios reales."
    echo "   Para el plugin: npm run build (production), nunca el output de npm start."
    exit 1
fi

echo "🔍 Validando JavaScript en archivos PHP..."
if bash wordpress-plugin/validate-php-javascript.sh; then
    echo "✅ Validación exitosa"
else
    echo "❌ Validación fallida - por favor corrija los errores antes de continuar"
    exit 1
fi

DIST_DIR="wordpress-plugin/dist"
mkdir -p "$DIST_DIR"

WORK_DIR="$DIST_DIR/guiders-wp-plugin"
rm -rf "$WORK_DIR"
cp -r wordpress-plugin/guiders-wp-plugin "$WORK_DIR"
rm -f "$WORK_DIR/.gitignore"

ZIP_NAME="guiders-wp-plugin-$PLUGIN_VERSION.zip"
ZIP_PATH="wordpress-plugin/$ZIP_NAME"

echo "🗜️  Generando ZIP: $ZIP_PATH"
cd "$DIST_DIR"
zip -r "$ZIP_NAME" "guiders-wp-plugin/" -x "*.DS_Store*" "*.git*" > /dev/null
cd - > /dev/null

# Mover zip a carpeta wordpress-plugin raíz para fácil acceso
mv -f "$DIST_DIR/$ZIP_NAME" "wordpress-plugin/" || true

echo "✅ Plugin creado exitosamente"
echo "   📁 $ZIP_PATH"
echo "   📏 Tamaño: $(du -h "$ZIP_PATH" | cut -f1)"
echo
echo "📋 Instalación en WordPress:"
echo "   1. Plugins → Añadir nuevo → Subir plugin"
echo "   2. Selecciona $ZIP_NAME"
echo "   3. Activar"
echo "   4. Configurar API Key en Configuración → Guiders SDK"
echo
echo "🧪 Verificación rápida tras activar:"
echo "   - Ver consola sin errores '❌' del SDK"
echo "   - Comprobar carga de guiders-sdk.js en Network"
echo
echo "💡 Tip: Usa --skip-build si sólo regeneras el zip tras editar metadatos"
echo "🎉 Listo"