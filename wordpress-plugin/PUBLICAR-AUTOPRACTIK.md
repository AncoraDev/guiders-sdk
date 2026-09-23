# Publicar Guiders en autopractik.es

El plugin **ya está** en https://autopractik.es (v2.14.1). Esta nota es para subir **2.14.2** sin FTP.

2.14.2 permite cerrar una rama del guion sin pedir datos de contacto. Sigue hablando con `guiders-api.ancoradual.com`.

## 1. ZIP

Desde `guiders-sdk`:

```bash
bash wordpress-plugin/build-plugin.sh
```

Sale `wordpress-plugin/guiders-wp-plugin-2.14.2.zip`.

## 2. En el admin de Autopractik

1. **Plugins → Añadir nuevo → Subir plugin**
2. Sube el ZIP. Si pide reemplazar Guiders SDK, acepta.
3. **Ajustes → Guiders SDK**
   - Plugin habilitado
   - API key (la que ya tiene)
   - Entorno: **production**
4. Guarda.

## 3. En Console (admin)

**Configuración → Chat web** para la empresa de autopractik.es. Ahora mismo en la web usan tema **carbon** y color **dark**; si no lo guardas ahí, el pixel volverá a default (system / default).

En Atención, **Conectado**, y prueba el chat en https://autopractik.es

## Siguientes versiones

Cuando haya un GitHub Release en `AncoraDev/guiders-sdk` con el ZIP, WordPress mostrará la actualización en **Plugins**. Hasta entonces, se sube el ZIP igual que ahora.
