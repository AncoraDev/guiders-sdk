#!/bin/bash

# Script helper para gestionar el entorno WordPress de desarrollo
# Ubicación: wordpress-plugin/wp-docker.sh (ejecutar desde aquí o vía ruta)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Preferir Docker Compose V2
if docker compose version > /dev/null 2>&1; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de ayuda
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

# Función para verificar si Docker está corriendo
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker no está corriendo. Por favor, inicia Docker Desktop."
        exit 1
    fi
}

# Función para verificar si los servicios están corriendo
check_services() {
    if ! "${COMPOSE[@]}" ps | grep -q "Up"; then
        return 1
    fi
    return 0
}

# Comandos
case "$1" in
    start)
        print_header "Iniciando WordPress"
        check_docker
        "${COMPOSE[@]}" up -d
        print_success "Servicios iniciados"
        print_info "WordPress: http://localhost:8090"
        print_info "phpMyAdmin: http://localhost:8091"
        ;;

    stop)
        print_header "Deteniendo WordPress"
        "${COMPOSE[@]}" stop
        print_success "Servicios detenidos"
        ;;

    restart)
        print_header "Reiniciando WordPress"
        "${COMPOSE[@]}" restart
        print_success "Servicios reiniciados"
        ;;

    down)
        print_header "Eliminando contenedores"
        print_warning "Esto eliminará los contenedores pero conservará los datos"
        "${COMPOSE[@]}" down
        print_success "Contenedores eliminados"
        ;;

    reset)
        print_header "Reset completo"
        print_warning "ESTO ELIMINARÁ TODOS LOS DATOS (contenedores + volúmenes)"
        read -p "¿Estás seguro? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            "${COMPOSE[@]}" down -v
            print_success "Entorno reseteado completamente"
        else
            print_info "Operación cancelada"
        fi
        ;;

    logs)
        print_header "Mostrando logs"
        if [ -z "$2" ]; then
            "${COMPOSE[@]}" logs -f
        else
            "${COMPOSE[@]}" logs -f "$2"
        fi
        ;;

    status)
        print_header "Estado de servicios"
        "${COMPOSE[@]}" ps
        ;;

    shell)
        print_header "Shell interactivo"
        service=${2:-wordpress}
        print_info "Conectando a: $service"
        "${COMPOSE[@]}" exec "$service" bash
        ;;

    plugin:activate)
        print_header "Activando plugin Guiders"
        "${COMPOSE[@]}" exec wpcli wp plugin activate guiders-wp-plugin --allow-root
        print_success "Plugin activado"
        ;;

    plugin:deactivate)
        print_header "Desactivando plugin Guiders"
        "${COMPOSE[@]}" exec wpcli wp plugin deactivate guiders-wp-plugin --allow-root
        print_success "Plugin desactivado"
        ;;

    plugin:list)
        print_header "Listando plugins"
        "${COMPOSE[@]}" exec wpcli wp plugin list --allow-root
        ;;

    plugin:install)
        if [ -z "$2" ]; then
            print_error "Uso: $0 plugin:install <nombre-plugin>"
            exit 1
        fi
        print_header "Instalando plugin: $2"
        "${COMPOSE[@]}" exec wpcli wp plugin install "$2" --activate --allow-root
        print_success "Plugin instalado y activado"
        ;;

    cookies:install)
        print_header "Instalando plugins de cookies populares"
        print_info "Instalando Moove GDPR..."
        "${COMPOSE[@]}" exec wpcli wp plugin install gdpr-cookie-compliance --allow-root
        print_info "Instalando Beautiful Cookie Banner..."
        "${COMPOSE[@]}" exec wpcli wp plugin install beautiful-and-responsive-cookie-consent --allow-root
        print_info "Instalando Complianz GDPR..."
        "${COMPOSE[@]}" exec wpcli wp plugin install complianz-gdpr --allow-root
        print_info "Instalando CookieYes..."
        "${COMPOSE[@]}" exec wpcli wp plugin install cookie-law-info --allow-root
        print_info "Instalando WP Consent API..."
        "${COMPOSE[@]}" exec wpcli wp plugin install wp-consent-api --allow-root
        print_success "Plugins de cookies instalados (usa plugin:list para verlos)"
        ;;

    db:backup)
        print_header "Haciendo backup de la base de datos"
        filename="backup-$(date +%Y%m%d-%H%M%S).sql"
        "${COMPOSE[@]}" exec wpcli wp db export "/var/www/html/$filename" --allow-root
        "${COMPOSE[@]}" exec wordpress mv "/var/www/html/$filename" /tmp/
        docker cp "guiders-wp-site:/tmp/$filename" "./$filename"
        print_success "Backup guardado: $filename"
        ;;

    db:import)
        if [ -z "$2" ]; then
            print_error "Uso: $0 db:import <archivo.sql>"
            exit 1
        fi
        print_header "Importando base de datos"
        docker cp "$2" guiders-wp-site:/tmp/import.sql
        "${COMPOSE[@]}" exec wpcli wp db import /tmp/import.sql --allow-root
        print_success "Base de datos importada"
        ;;

    cache:flush)
        print_header "Limpiando caché"
        "${COMPOSE[@]}" exec wpcli wp cache flush --allow-root
        print_success "Caché limpiada"
        ;;

    url:replace)
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_error "Uso: $0 url:replace <url-antigua> <url-nueva>"
            exit 1
        fi
        print_header "Reemplazando URLs"
        "${COMPOSE[@]}" exec wpcli wp search-replace "$2" "$3" --allow-root
        print_success "URLs reemplazadas"
        ;;

    open)
        print_header "Abriendo WordPress en el navegador"
        if command -v open &> /dev/null; then
            open "http://localhost:8090"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:8090"
        else
            print_info "Abre manualmente: http://localhost:8090"
        fi
        ;;

    help|*)
        print_header "WordPress Docker Helper - Guiders SDK"
        echo "Uso: $0 <comando> [opciones]"
        echo ""
        echo "Comandos disponibles:"
        echo ""
        echo "  ${GREEN}Gestión de servicios:${NC}"
        echo "    start                 - Iniciar WordPress y servicios"
        echo "    stop                  - Detener servicios (conserva datos)"
        echo "    restart               - Reiniciar servicios"
        echo "    down                  - Eliminar contenedores (conserva datos)"
        echo "    reset                 - Reset completo (ELIMINA TODO)"
        echo "    status                - Ver estado de servicios"
        echo "    logs [servicio]       - Ver logs (wordpress, db, phpmyadmin)"
        echo ""
        echo "  ${GREEN}Navegación:${NC}"
        echo "    open                  - Abrir WordPress en el navegador"
        echo "    shell [servicio]      - Shell interactivo (default: wordpress)"
        echo ""
        echo "  ${GREEN}Gestión de plugins:${NC}"
        echo "    plugin:activate       - Activar plugin Guiders"
        echo "    plugin:deactivate     - Desactivar plugin Guiders"
        echo "    plugin:list           - Listar todos los plugins"
        echo "    plugin:install <nombre> - Instalar plugin de WordPress.org"
        echo "    cookies:install       - Instalar plugins de cookies populares"
        echo ""
        echo "  ${GREEN}Base de datos:${NC}"
        echo "    db:backup             - Hacer backup de la BD"
        echo "    db:import <archivo>   - Importar backup de BD"
        echo "    url:replace <old> <new> - Reemplazar URLs en la BD"
        echo ""
        echo "  ${GREEN}Mantenimiento:${NC}"
        echo "    cache:flush           - Limpiar caché de WordPress"
        echo ""
        echo "Ejemplos:"
        echo "  $0 start"
        echo "  $0 logs wordpress"
        echo "  $0 plugin:install woocommerce"
        echo "  $0 db:backup"
        echo "  $0 shell"
        echo ""
        ;;
esac
