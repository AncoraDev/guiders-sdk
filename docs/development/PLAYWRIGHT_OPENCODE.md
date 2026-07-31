# 🎭 Guía de Playwright para OpenCode

## ✅ Estado Actual

**Playwright está configurado y funcionando correctamente** en el proyecto Guiders SDK.

### Tests Ejecutados con Éxito

```bash
✓ 5 tests passed (3.6s)
  ✓ should verify SDK has V1 cleanup code
  ✓ should verify localStorage can be cleaned
  ✓ should verify V1 events are detected
  ✓ should verify WordPress is accessible
  ✓ should verify test pages are accessible
```

---

## 🚀 Cómo Ejecutar Tests desde OpenCode

### Comando Básico
```bash
cd /Users/rogerpugaruiz/Proyectos/guiders-sdk && npx playwright test
```

### Ejecutar Tests Específicos

```bash
# Test de verificación de deployment
npx playwright test deployment-verification.spec.ts

# Tests de cola de eventos y TTL
npx playwright test event-queue-ttl.spec.ts

# Tests de chat
npx playwright test chat.spec.ts

# Test específico por nombre
npx playwright test --grep "should verify SDK has V1 cleanup code"
```

### Modos de Ejecución

```bash
# Con UI interactiva (recomendado para debugging)
npx playwright test --ui

# Con navegador visible
npx playwright test --headed

# Modo debug (step-by-step)
npx playwright test --debug

# Solo un navegador
npx playwright test --project=chromium

# Ver reporte del último test
npx playwright show-report
```

---

## 📊 Tests Disponibles

### 1. deployment-verification.spec.ts ✅ (NUEVO)
**Propósito:** Verificar que el deployment está correcto

**Tests:**
- ✅ SDK tiene código V1 cleanup
- ✅ localStorage funciona
- ✅ Detección de eventos V1
- ✅ WordPress accesible
- ✅ Páginas de test accesibles

**Ejecutar:**
```bash
npx playwright test deployment-verification.spec.ts
```

---

### 2. event-queue-ttl.spec.ts ⚠️ (Requiere PHP server)
**Propósito:** Tests de TTL y payload limits

**Tests:**
- Configuración por defecto
- Enqueue de eventos
- Límite maxQueueSize
- Pruning de eventos expirados
- Payload trimming
- Persistencia en localStorage

**Ejecutar:**
```bash
# Primero iniciar servidor PHP
php -S 127.0.0.1:8083 -t demo/app

# Luego ejecutar tests
npx playwright test event-queue-ttl.spec.ts
```

---

### 3. chat.spec.ts ⚠️ (Requiere PHP server + backend)
**Propósito:** Tests de UI de chat

**Ejecutar:**
```bash
php -S 127.0.0.1:8083 -t demo/app
npx playwright test chat.spec.ts
```

---

### 4. wordpress-v1-cleanup.spec.ts ⚠️ (Parcialmente funcional)
**Propósito:** Test de limpieza V1 en WordPress

**Nota:** Las páginas HTML standalone no inicializan el SDK automáticamente. Usar `deployment-verification.spec.ts` en su lugar.

---

## 🎯 Casos de Uso Comunes

### Verificar Deployment Actual
```bash
cd /Users/rogerpugaruiz/Proyectos/guiders-sdk
npx playwright test deployment-verification.spec.ts --reporter=list
```

**Output esperado:**
```
✓ 5 passed (3.6s)
  ✓ should verify SDK has V1 cleanup code
  ✓ should verify localStorage can be cleaned
  ✓ should verify V1 events are detected
  ✓ should verify WordPress is accessible
  ✓ should verify test pages are accessible
```

---

### Debug Test Fallido
```bash
# Ver screenshot del error
ls test-results/*/test-failed-1.png

# Ver HTML del error
cat test-results/*/error-context.md

# Re-ejecutar con debug UI
npx playwright test <test-name> --debug
```

---

### Ejecutar SOLO Tests que NO Requieren PHP Server
```bash
npx playwright test deployment-verification.spec.ts
```

---

### Ejecutar Tests con Servidor PHP
```bash
# Terminal 1: Servidor PHP
php -S 127.0.0.1:8083 -t demo/app

# Terminal 2: Tests
npx playwright test event-queue-ttl.spec.ts
```

---

## 📁 Estructura de Tests

```
tests/
└── e2e/
    ├── deployment-verification.spec.ts  ✅ LISTO (no requiere server)
    ├── event-queue-ttl.spec.ts         ⚠️  Requiere PHP server
    ├── chat.spec.ts                     ⚠️  Requiere PHP server + backend
    ├── unread-messages-badge.spec.ts   ⚠️  Requiere PHP server + backend
    └── wordpress-v1-cleanup.spec.ts    ⚠️  Parcial (usar deployment-verification)
```

---

## 🎭 Playwright Inspector (Debug UI)

Para debugging interactivo:

```bash
npx playwright test --ui
```

**Características:**
- ⏯️  Pausar/reanudar tests
- 🔍 Inspeccionar elementos
- 📸 Ver screenshots
- 📹 Ver grabaciones
- 🐛 Step-by-step debugging

---

## 💡 Tips para Usar con OpenCode

### 1. Pedir a OpenCode que ejecute tests
```
"Ejecuta los tests de deployment-verification"
```

OpenCode ejecutará:
```bash
cd /Users/rogerpugaruiz/Proyectos/guiders-sdk && \
npx playwright test deployment-verification.spec.ts --reporter=list
```

---

### 2. Crear nuevos tests
```
"Crea un test de Playwright para verificar que la cola no excede 1000 eventos"
```

OpenCode creará el archivo `.spec.ts` y lo ejecutará.

---

### 3. Debug tests fallidos
```
"El test X falló, muéstrame el screenshot del error"
```

OpenCode leerá:
```bash
test-results/<test-name>/test-failed-1.png
```

---

## 🔧 Configuración de Playwright

Ver `playwright.config.ts` para:
- Browsers configurados
- Timeouts
- Screenshot settings
- Video recording
- Base URL

---

## ✅ Verificación Rápida

Para verificar que Playwright funciona:

```bash
cd /Users/rogerpugaruiz/Proyectos/guiders-sdk
npx playwright test deployment-verification.spec.ts --reporter=list
```

**Debe mostrar:**
```
✓ 5 passed (3.6s)
```

---

## 🚨 Troubleshooting

### Error: "No tests found"
```bash
# Listar todos los tests
npx playwright test --list
```

### Error: "Browser not found"
```bash
# Instalar browsers
npx playwright install
```

### Error: "Connection refused"
```bash
# Verificar que el servidor está corriendo
curl http://localhost:8090/
curl http://127.0.0.1:8083/
```

---

## 📖 Documentación

- Playwright Docs: https://playwright.dev/
- Test API: https://playwright.dev/docs/api/class-test
- Assertions: https://playwright.dev/docs/test-assertions

---

## 🎉 Resumen

✅ Playwright configurado
✅ Tests funcionando
✅ Se pueden ejecutar desde OpenCode con comandos bash
✅ Test suite de verificación de deployment listo
✅ Puedo ejecutar tests yo mismo para verificar cambios

**Comando principal:**
```bash
npx playwright test deployment-verification.spec.ts
```
