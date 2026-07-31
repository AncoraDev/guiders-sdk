# Story 7.1: Configuración de tema del widget desde WP Admin

**Epic:** Epic 7 — Customización y configuración administrativa
**Status:** Completed
**Depends on:** Story 6.1 (sistema de tokens GCS), Story 6.7 (responsive + dark mode)
**Implements:** BL-001 (Product Backlog)
**Source:** [docs/reference/BACKLOG.md](../../../docs/reference/BACKLOG.md)

---

## Context: Two independent "theme" dimensions

Before reading this story, understand that the SDK now has **two orthogonal theme concepts** that must not be confused:

| Dimension | Option name | Values | Purpose | Status |
|-----------|-------------|--------|---------|--------|
| **Design theme** | `SDKOptions.theme` (`ThemeId`) | `'default'`, `'carbon'`, … | Palette, radius, shadows, `primaryColor` | **Already implemented** (Story 6.x) |
| **Color-scheme override** | `SDKOptions.colorScheme` (new) | `'dark'`, `'light'`, `'system'` | Force or follow OS dark/light preference | **This story** |

The design theme (`ThemeId`) drives which colors are used for each mode. The color-scheme override drives *which mode* (light or dark) is active. Both apply simultaneously.

> **Breaking-change risk**: the WP Admin field introduced here must use a **separate** key (`chat_color_scheme`, not `chat_theme`) to avoid colliding with the existing design-theme option.

---

## User Story

Como administrador del sitio WordPress,
quiero forzar un modo de color concreto del widget de chat (claro / oscuro / automático) desde el panel de configuración del plugin,
para que la apariencia del widget coincida con la identidad visual de mi sitio independientemente de la preferencia del sistema operativo del visitante.

---

## Acceptance Criteria

**Given** que el plugin de WordPress está instalado y `chat_color_scheme` no está definido (primera carga)
**When** se renderiza el widget en una página pública
**Then** el widget sigue la preferencia del sistema operativo del visitante vía `prefers-color-scheme` (comportamiento actual sin regresión)

**Given** que el administrador entra en `WP Admin → Guiders → Chat`
**When** la pantalla de configuración carga
**Then** aparece un campo `select` etiquetado "Modo de color del widget" con tres opciones: "Automático (preferencia del sistema)" (default), "Claro", "Oscuro"

**Given** que el administrador selecciona "Oscuro" y guarda los cambios
**When** un visitante carga cualquier página pública del sitio
**Then** `window.GUIDERS_CONFIG.colorScheme === 'dark'`
**And** el host del Shadow DOM (`#guiders-chat-widget`) tiene el atributo `data-color-scheme="dark"`
**And** el widget muestra los tokens del modo oscuro del tema activo (`--gds-color-bg` del conjunto `dark` del tema) independientemente de `prefers-color-scheme`

**Given** que el administrador selecciona "Claro" y guarda
**When** un visitante con SO en modo oscuro (`prefers-color-scheme: dark`) carga la página
**Then** el widget se renderiza con los tokens del modo claro del tema activo (la media query es ignorada)
**And** el host tiene `data-color-scheme="light"`

**Given** que el administrador selecciona "Automático"
**When** se guarda la configuración
**Then** `GUIDERS_CONFIG.colorScheme === 'system'`
**And** el host **no** tiene atributo `data-color-scheme`
**And** la media query `prefers-color-scheme` vuelve a controlar la apariencia

**Given** que el tema activo es `'carbon'` (con `primaryColor: '#fafafa'` y `colorTextOnPrimary: '#09090b'`)
**When** se fuerza modo oscuro con `data-color-scheme="dark"`
**Then** `--guiders-primary` sigue siendo `#fafafa` (viene de `ThemeDefinition.primaryColor`, independiente del color-scheme)
**And** `--gds-color-text-on-primary` sigue siendo `#09090b` (viene de `ThemeColorSet.colorTextOnPrimary` del conjunto `dark` del tema carbon)

**Given** cualquier valor de `colorScheme` ('dark', 'light', 'system') y cualquier design theme activo
**When** se inspecciona el DOM del widget
**Then** los tokens fijos por requisito legal (`--gds-color-author-ai: #7c3aed` claro / `#8b5cf6` oscuro y `--gds-color-author-ai-soft`) **siguen alternándose** correctamente entre sus valores claro/oscuro según el modo de color activo
**And** ningún valor del usuario puede sobrescribir esos dos tokens (cumplimiento P7 / EU AI Act Art. 50)

**Given** que el administrador envía el formulario con un valor manipulado de `chat_color_scheme` (p. ej. `dark'; DROP TABLE`)
**When** PHP procesa la validación
**Then** el valor se rechaza y se persiste el default `'system'` (whitelist con `in_array(['system','light','dark'], true)`)

**Given** que se ejecuta `npx tsc --noEmit --strict`
**When** completa
**Then** no hay errores TypeScript

**Given** que se ejecutan los tests E2E
**When** completan
**Then** todos los tests existentes pasan
**And** los 3 nuevos tests de color-scheme (system / forced-dark / forced-light) pasan

**Given** el bundle compilado
**When** se mide el peso gzip
**Then** el incremento respecto a la baseline previa a la story es ≤ 0.5 KB gzip

---

## Technical Notes

### Plumbing chain (config flow)
```
WP Admin form (chat_color_scheme)
  → wp_options['guiders_wp_plugin_settings']['chat_color_scheme']
  → class-guiders-public.php::getSDKConfig() añade 'colorScheme' al $config
  → wp_localize_script('guiders-sdk', 'GUIDERS_CONFIG', $config)
  → window.GUIDERS_CONFIG.colorScheme  (browser)
  → src/index.ts shallow merge → SDKOptions.colorScheme
  → TrackingPixelSDK constructor lo propaga a ChatUIBridge
  → ChatUIBridge → mountChatWidget(options)
  → shadowHost.setAttribute('data-color-scheme', options.colorScheme)  // solo si !== 'system'
  → CSS selectors :host([data-color-scheme="dark"]) / :host([data-color-scheme="light"]) en tokens.styles.ts
```

> **Note**: `SDKOptions.theme` (type `ThemeId`) already exists and drives the design theme
> (palette, radius, `primaryColor`, etc.). The new `SDKOptions.colorScheme` is a separate
> option with type `'dark' | 'light' | 'system'`.

### Refactor de `tokens.styles.ts` (clave técnica)

Actualmente la dark mode vive en:
```css
@media (prefers-color-scheme: dark) {
    :host { /* dark color overrides + --gds-color-text-on-primary from theme.dark */ }
}
```

Hay que extraer el cuerpo de overrides a una constante reutilizable y emitirlo bajo dos selectores adicionales:

```css
/* Forzado por admin */
:host([data-color-scheme="dark"]) { /* mismos overrides dark del tema activo */ }

/* Automático (system) — solo si no hay forzado claro */
@media (prefers-color-scheme: dark) {
    :host(:not([data-color-scheme="light"])) { /* mismos overrides */ }
}
```

**Importante**: el bloque de overrides dark ya incluye `--gds-color-text-on-primary` derivado de `theme?.dark?.colorTextOnPrimary` (implementado en la sesión de design-themes). Al extraer el bloque a constante, ese valor debe propagarse correctamente en ambos selectores.

El bloque `--guiders-primary` (derivado de `theme?.primaryColor`) vive en `:host { }` base y **no** se repite en el bloque dark — es intencional, ya que `primaryColor` es independiente del color-scheme.

Justificación del selector `:host(:not([data-color-scheme="light"]))`: cubre el caso "no se puso atributo" (modo system) y el caso defensivo en que `data-color-scheme="dark"` esté presente (donde la regla forzada ya aplicaría). Si `data-color-scheme="light"`, la media query queda neutralizada.

### Restricción legal NO negociable

Los tokens `--gds-color-author-ai` y `--gds-color-author-ai-soft` son **fijos por EU AI Act Art. 50** y deben seguir alternando entre sus valores claro y oscuro según el color-scheme activo. El refactor debe mantenerlos dentro del bloque de overrides dark — **nunca** exponerlos como customizables vía `--guiders-*` ni via `ThemeColorSet`.

### WP Admin: patrón a copiar

Replicar el patrón de `autoInitModeFieldCallback` en `class-guiders-admin.php:1276-1291` (select con array `$options`). Sección destino: `guiders_chat_features_section` en la página `guiders-settings-chat`. Validación en `validateSettings()` siguiendo el patrón de `environment` (line 757-762) con whitelist `['system','light','dark']`.

### WP Public: emisión de config

Añadir una sola línea en el array `$config` dentro de `getSDKConfig()` (`class-guiders-public.php` ~línea 158):
```php
'colorScheme' => isset($this->settings['chat_color_scheme']) && in_array($this->settings['chat_color_scheme'], ['system','light','dark'], true)
    ? $this->settings['chat_color_scheme']
    : 'system',
```

⚠️ **Aviso de naming**: ya existe `'theme' => get_template()` dentro del sub-array `wordpress` (línea 138) y `'theme'` top-level (usado por el design-theme system). La nueva clave es `'colorScheme'` (camelCase) en `GUIDERS_CONFIG` y `chat_color_scheme` (snake_case) en `wp_options`. No colisionan, pero documentarlo en el commit.

### Edge case: cambio de color-scheme sin recarga

`mountChatWidget()` tiene un guard de idempotencia que retorna si el host ya existe. Si el admin cambia el color-scheme, el visitante necesitará recargar. **Decisión consciente**: no implementar hot-swap del atributo en esta story. Documentar en el campo de ayuda del admin: "Los cambios se aplican en la próxima carga de página."

### Tests E2E nuevos

Crear `tests/e2e/color-scheme.spec.ts` con 3 tests:
1. **Default**: sin `GUIDERS_CONFIG.colorScheme` + `page.emulateMedia({ colorScheme: 'dark' })` → host sin `data-color-scheme`, tokens oscuros del tema activo aplicados.
2. **Forzado dark**: `GUIDERS_CONFIG.colorScheme = 'dark'` + emulación `colorScheme: 'light'` → host con `data-color-scheme="dark"`, tokens oscuros.
3. **Forzado light**: `GUIDERS_CONFIG.colorScheme = 'light'` + emulación `colorScheme: 'dark'` → host con `data-color-scheme="light"`, tokens claros.

Estrategia de aserción: leer `getComputedStyle()` de `--gds-color-bg` sobre el shadow host. Para el tema `default` en dark: `#0f172a`. Para el tema `carbon` en dark: `#000000`.

---

## Files to Modify

### SDK (TypeScript)
- `src/core/tracking-pixel-SDK.ts` — añadir `colorScheme?: 'dark' | 'light' | 'system'` a `SDKOptions` (~línea 92, junto a `chatPosition`). **No modificar** el campo existente `theme?: ThemeId`.
- `src/index.ts` — extender el typing de `Window['GUIDERS_CONFIG']` con `colorScheme?` (~línea 35)
- `src/presentation/types/chat-types.ts` — añadir `colorScheme?` a `ChatUIOptions`
- `src/presentation/styles/tokens.styles.ts` — refactor del bloque dark según patrón descrito en Technical Notes; preservar la lógica de `primaryColor` y `colorTextOnPrimary` ya implementada
- `src/presentation/components/ChatWidget/ChatWidget.tsx` — `setAttribute('data-color-scheme', ...)` sobre `shadowHost` cuando `colorScheme !== 'system'` (~línea 272)
- `src/presentation/bridge/ChatUIBridge.ts` (o equivalente) — forward de `sdkOptions.colorScheme` → `chatUIOptions.colorScheme`

### WordPress Plugin (PHP)
- `wordpress-plugin/guiders-wp-plugin/includes/class-guiders-admin.php`:
  - Registro del campo (~línea 131, sección `guiders_chat_features_section`)
  - Callback `chatColorSchemeFieldCallback()` (modelado sobre `autoInitModeFieldCallback`)
  - Validación en `validateSettings()` (~línea 760)
- `wordpress-plugin/guiders-wp-plugin/includes/class-guiders-public.php`:
  - Añadir `'colorScheme'` al array `$config` en `getSDKConfig()` (~línea 158)

### Tests
- `tests/e2e/color-scheme.spec.ts` (nuevo) — 3 tests descritos en Technical Notes

### Documentación
- `docs/BACKLOG.md` — eliminar entrada BL-001 (promovida a story)
- `wordpress-plugin/README.md` o `CHANGELOG.md` — registrar la nueva opción

---

## Definition of Done

- [ ] `SDKOptions.colorScheme` añadido y tipado (sin tocar `SDKOptions.theme: ThemeId`)
- [ ] `tokens.styles.ts` refactorizado: la dark mode aplica con `:host([data-color-scheme="dark"])` Y con `@media (prefers-color-scheme: dark) :host(:not([data-color-scheme="light"]))`
- [ ] La lógica de `primaryColor` (`--guiders-primary`) y `colorTextOnPrimary` (`--gds-color-text-on-primary`) implementada en la sesión de design-themes **no se rompe** tras el refactor
- [ ] Tokens `--gds-color-author-ai` y `--gds-color-author-ai-soft` siguen flipando correctamente y NO son customizables
- [ ] `ChatWidget.tsx` aplica `data-color-scheme` sobre el shadow host cuando `colorScheme !== 'system'`
- [ ] Bridge propaga `colorScheme` desde `SDKOptions` hasta `mountChatWidget`
- [ ] Campo "Modo de color del widget" visible y funcional en `WP Admin → Guiders → Chat`
- [ ] Validación PHP rechaza valores fuera de la whitelist (`system`, `light`, `dark`)
- [ ] `class-guiders-public.php::getSDKConfig()` emite `colorScheme` top-level en `GUIDERS_CONFIG`
- [ ] 3 nuevos tests E2E (`tests/e2e/color-scheme.spec.ts`) pasando
- [ ] `npm run build` sin errores ni warnings
- [ ] `npx tsc --noEmit --strict` sin errores
- [ ] Suite E2E completa pasando
- [ ] Bundle delta ≤ 0.5 KB gzip respecto a baseline previa
- [ ] BL-001 eliminado de `docs/BACKLOG.md`
- [ ] Verificación manual en navegador con servidor PHP demo: switch system/light/dark visible al recargar, tanto con tema `default` como `carbon`
- [ ] Commit final con `npm run build && cp dist/index.js wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.js && cp dist/index.js demo/app/guiders-sdk.js`

---

## Out of Scope (explícito)

- **Hot-swap del color-scheme sin recarga**: cambios aplicados solo en próxima carga de página (consistente con resto de settings WP).
- **Personalización de paleta** vía variables `--guiders-*` adicionales: ya cubierto por Story 6.1, no se amplía aquí.
- **Nuevos design themes** (más allá de `default` y `carbon`): cubierto por el sistema de themes implementado en Story 6.x.
- **Tema "auto por horario"** (claro de día / oscuro de noche): si surge demanda, nueva entrada de backlog.
- **Sincronización multi-pestaña** del cambio de color-scheme: fuera de alcance.

---

## Estimated Effort

~3–4h (según estimación original del backlog, validada tras research técnico).
