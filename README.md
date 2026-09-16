# Guiders SDK

Widget de chat y tracking para webs de clientes. Documentación: [docs/README.md](docs/README.md).

Necesitas el backend en http://localhost:3000 y Console si quieres ver al visitante en Atención.

## Demo (abrir esto)

Web de prueba con el widget. PHP ejecuta `demo/app`.

```bash
cd guiders-sdk
npm install              # primera vez
npm run demo
```

**http://127.0.0.1:8083**

La demo usa la API key de Demo Company para `127.0.0.1`. Si identify falla (`API Key inválida`), crea las keys y el sitio:

```bash
cd guiders-backend
node bin/guiders-cli.js create-apikey --domain 127.0.0.1 --company-id <DEMO_COMPANY_ID>
node bin/guiders-cli.js create-apikey --domain localhost --company-id <DEMO_COMPANY_ID>
```

Copia la key de `127.0.0.1` a `demo/app/partials/header.php` (`window.GUIDERS_CONFIG.apiKey`). Recarga la demo (el mensaje del widget es local hasta que identify funciona). En Console, Atención → Conectado; el chat entra en Pendientes.

Si el bundle aún no existe (`demo/app/guiders-sdk.js`), una vez: `npm run build`.

## Compilar el SDK

Solo si cambias código del SDK. Recompila y escribe `demo/app/guiders-sdk.js`.

```bash
npm run watch
```

No abras el puerto 8081: es el compilador, no la web. La demo sigue siendo :8083.

## WordPress (plugin)

Opcional. Levanta Docker WP + webpack.

```bash
npm start
```

http://localhost:8090

Guía de producto e instalación: [docs/producto.md](docs/producto.md).
