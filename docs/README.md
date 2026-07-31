# Documentación Guiders SDK

Índice único de la documentación del repositorio. En la raíz solo quedan:

- [`README.md`](../README.md) — guía de producto e instalación
- [`AGENTS.md`](../AGENTS.md) — instrucciones para agentes de código
- [`CLAUDE.md`](../CLAUDE.md) — arquitectura y patrones de desarrollo

La documentación del **plugin WordPress** (guías de usuario, GDPR WP, debugging) sigue en [`wordpress-plugin/`](../wordpress-plugin/) porque viaja con el producto WP; aquí se enlaza.

---

## Consentimiento / GDPR

| Documento | Descripción |
|-----------|-------------|
| [GDPR_CONSENT.md](./consent/GDPR_CONSENT.md) | Guía principal de consentimiento |
| [CONSENT_IDENTIFY_INTEGRATION.md](./consent/CONSENT_IDENTIFY_INTEGRATION.md) | Integración consent + identify |
| [CONSENT_BANNER_IMPLEMENTATION.md](./consent/CONSENT_BANNER_IMPLEMENTATION.md) | Banner de consentimiento |
| [CHAT_CONSENT_MESSAGE.md](./consent/CHAT_CONSENT_MESSAGE.md) | Mensaje de consent en chat |
| [GDPR_COMPLIANCE_SUMMARY.md](./consent/GDPR_COMPLIANCE_SUMMARY.md) | Resumen ejecutivo |
| [GDPR_COMPLIANCE_ANALYSIS.md](./consent/GDPR_COMPLIANCE_ANALYSIS.md) | Análisis de cumplimiento |
| [GDPR_TESTING_CHECKLIST.md](./consent/GDPR_TESTING_CHECKLIST.md) | Checklist de tests GDPR |
| [GDPR_FIXES_SUMMARY.md](./consent/GDPR_FIXES_SUMMARY.md) | Resumen de correcciones |
| [GDPR_GUIDE_COMPLIANCE_REVIEW.md](./consent/GDPR_GUIDE_COMPLIANCE_REVIEW.md) | Revisión de guías |
| [CHANGELOG_GDPR_INTEGRATION.md](./consent/CHANGELOG_GDPR_INTEGRATION.md) | Changelog integración GDPR |

**WordPress (en el plugin):**

- [GDPR_QUICKSTART.md](../wordpress-plugin/guiders-wp-plugin/GDPR_QUICKSTART.md)
- [WORDPRESS_GDPR_GUIDE.md](../wordpress-plugin/WORDPRESS_GDPR_GUIDE.md)
- [WP_CONSENT_API_INTEGRATION.md](../wordpress-plugin/WP_CONSENT_API_INTEGRATION.md)

---

## Tracking

| Documento | Descripción |
|-----------|-------------|
| [TRACKING_V2_GUIDE.md](./tracking/TRACKING_V2_GUIDE.md) | Guía Tracking V2 |
| [TRACKING_V2_TROUBLESHOOTING.md](./tracking/TRACKING_V2_TROUBLESHOOTING.md) | Troubleshooting |
| [IMPLEMENTATION_TTL_PAYLOAD_LIMITS.md](./tracking/IMPLEMENTATION_TTL_PAYLOAD_LIMITS.md) | TTL y límites de payload |
| [SIGNAL_HEADERS_IMPLEMENTATION.md](./tracking/SIGNAL_HEADERS_IMPLEMENTATION.md) | Signal headers |

---

## Chat y tiempo real

| Documento | Descripción |
|-----------|-------------|
| [WEBSOCKET_REALTIME_CHAT.md](./chat/WEBSOCKET_REALTIME_CHAT.md) | Arquitectura WebSocket chat |
| [WEBSOCKET_OWN_MESSAGE_FILTER.md](./chat/WEBSOCKET_OWN_MESSAGE_FILTER.md) | Filtro de mensajes propios |
| [WEBSOCKET_LOGS_GUIDE.md](./chat/WEBSOCKET_LOGS_GUIDE.md) | Logs WebSocket |
| [CHAT_SCROLL_INFINITO.md](./chat/CHAT_SCROLL_INFINITO.md) | Scroll infinito |
| [WELCOME_MESSAGES.md](./chat/WELCOME_MESSAGES.md) | Mensajes de bienvenida |
| [AWAY_STATUS_SOLUTION.md](./chat/AWAY_STATUS_SOLUTION.md) | Estado away |

---

## Presence

| Documento | Descripción |
|-----------|-------------|
| [PRESENCE_SYSTEMS.md](./presence/PRESENCE_SYSTEMS.md) | Dos sistemas de presence (referencia) |
| [PRESENCE_INDEPENDENCE.md](./presence/PRESENCE_INDEPENDENCE.md) | Independencia de sistemas |
| [sdk-commercial-availability.md](./presence/sdk-commercial-availability.md) | Disponibilidad comercial |

---

## WordPress (SDK)

| Documento | Descripción |
|-----------|-------------|
| [DOCKER_WORDPRESS.md](./wordpress/DOCKER_WORDPRESS.md) | Docker local WP (`wordpress-plugin/docker-compose.yml`) |
| [WORDPRESS_ACTIVE_HOURS.md](./wordpress/WORDPRESS_ACTIVE_HOURS.md) | Horario activo en WP |
| [WORDPRESS_AUTO_UPDATES.md](./wordpress/WORDPRESS_AUTO_UPDATES.md) | Auto-updates del plugin |

**Más docs del plugin:** [`wordpress-plugin/README.md`](../wordpress-plugin/README.md), [`GUIA-USUARIO.md`](../wordpress-plugin/GUIA-USUARIO.md), [`DEBUGGING_GUIDE.md`](../wordpress-plugin/DEBUGGING_GUIDE.md).

---

## Desarrollo y ops

| Documento | Descripción |
|-----------|-------------|
| [PLAYWRIGHT_OPENCODE.md](./development/PLAYWRIGHT_OPENCODE.md) | Tests E2E Playwright |
| [ACTIVE_HOURS.md](./development/ACTIVE_HOURS.md) | Horario activo (SDK) |
| [OPTIONAL_ENDPOINTS.md](./development/OPTIONAL_ENDPOINTS.md) | Endpoints opcionales |
| [backend-endpoints-required.md](./development/backend-endpoints-required.md) | Endpoints backend requeridos |
| [DEV_RANDOM_MESSAGES.md](./development/DEV_RANDOM_MESSAGES.md) | Mensajes random en dev |
| [DEPLOYMENT_STATUS.md](./development/DEPLOYMENT_STATUS.md) | Estado de despliegue (histórico) |

---

## Demo

| Documento | Descripción |
|-----------|-------------|
| [GDPR_SETUP.md](./demo/GDPR_SETUP.md) | Setup GDPR en demo PHP |
| [TRACKING_DEMO_README.md](./demo/TRACKING_DEMO_README.md) | Demo de tracking |
| [FLUSH_FIX.md](./demo/FLUSH_FIX.md) | Nota flush demo |

App demo: [`demo/app/`](../demo/app/) — `php -S 127.0.0.1:8083 -t demo/app`

---

## Referencia

| Documento | Descripción |
|-----------|-------------|
| [PIXEL_ES.md](./reference/PIXEL_ES.md) | Pixel (ES) |
| [PIXEL_EN.md](./reference/PIXEL_EN.md) | Pixel (EN) |
| [BACKLOG.md](./reference/BACKLOG.md) | Backlog |

---

## Copilot / agentes

- [copilot-review-instructions.md](./copilot/copilot-review-instructions.md)
- [copilot-commit-message-instructions.md](./copilot/copilot-commit-message-instructions.md)
- Raíz: [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
