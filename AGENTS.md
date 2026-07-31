# AGENTS.md - Guiders SDK

Guide for AI coding agents working on this TypeScript SDK for real-time visitor tracking and chat.

## Build/Lint/Test Commands

```bash
# Build (production UMD bundle → dist/index.js)
npm run build

# Development (hot reload on :8081 + WordPress Docker)
npm start

# Type checking (no ESLint configured)
npx tsc --noEmit --strict

# Run ALL E2E tests (requires PHP demo server running)
npm test

# Run SINGLE test file
npx playwright test tests/e2e/chat.spec.ts

# Run tests matching pattern
npx playwright test -g "should load messages"

# Interactive test UI (recommended for debugging)
npm run test:ui

# Debug mode (step-by-step)
npm run test:debug

# Run with visible browser
npm run test:headed

# Show last test report
npm run test:report
```

### Test Server Setup
Tests require the PHP demo server:
```bash
# Terminal 1: Start demo server
php -S 127.0.0.1:8083 -t demo/app

# Terminal 2: Run tests
npm test
```

### WordPress Plugin Commands
```bash
npm run release:wp          # Build SDK + package ZIP
npm run release:wp:skip     # Package ZIP (skip build)
npm run release:wp:publish  # Full release: build → ZIP → git commit → tag → push
```

### SDK Deployment (After Changes)
After SDK modifications, update test environments:
```bash
npm run build 2>&1 && \
cp dist/index.js wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.js && \
cp dist/index.js demo/app/guiders-sdk.js
```

## Event Queue Management (TTL & Limits)

The SDK implements automatic event expiration and payload size limits to prevent backend overload:

### Default Configuration
| Setting | Default | Description |
|---------|---------|-------------|
| `maxQueueSize` | 1,000 events | Maximum events in queue (reduced from 10,000) |
| `eventTtlMs` | 86,400,000 ms (24h) | Events older than TTL are discarded |
| `maxPayloadSizeBytes` | 1,048,576 bytes (1 MB) | Maximum HTTP payload size per request |

### Behavior
- **Automatic Pruning**: Expired events are pruned when:
  - New events are enqueued (`enqueue()`)
  - Batches are retrieved (`getBatch()`)
  - Queue is loaded from localStorage (`loadFromStorage()`)

- **Silent Discard**: Old events are removed with debug logs only (no warnings)

- **Payload Limits**: If a batch exceeds 1 MB:
  1. Events are trimmed using binary search to fit limit
  2. Remaining events are sent in multiple requests automatically
  3. Minimum 10 events per batch to avoid infinite loops

- **SendBeacon Limit**: Uses stricter 64 KB limit (browser restriction)

### Configuration Example
```typescript
new TrackingPixelSDK({
  apiKey: 'gds_xxx',
  trackingV2: {
    maxQueueSize: 500,           // Custom queue size
    eventTtlMs: 3600000,         // 1 hour TTL
    maxPayloadSizeBytes: 524288  // 512 KB limit
  }
});
```

### Queue Statistics (Available via `getStats()`)
```typescript
const stats = eventQueueManager.getStats();
console.log(stats);
// Output:
// {
//   size: 250,
//   maxSize: 1000,
//   utilizationPercent: 25,
//   persistEnabled: true,
//   ttlMs: 86400000,
//   ttlHours: 24,
//   oldestEventAgeMs: 7200000,
//   oldestEventAgeHours: 2
// }
```

## Presence Systems (TWO Independent Systems)

The SDK exposes **two distinct presence systems** that answer different
business questions. **Do NOT confuse them**:

| System | Question Answered | Scope | Service |
|--------|-------------------|-------|---------|
| **Commercial Availability** | "Are there ANY agents online for this site?" | Tenant-wide | `CommercialAvailabilityService` |
| **Chat Presence** | "What is the status of the agent assigned to THIS chat?" | Per-conversation | `PresenceService` |

**Key rule for Chat Presence**: Always filter by `userType === 'commercial'`
when consuming `presence:changed` events or aggregating `participants` from
`GET /presence/chat/{chatId}`. Otherwise the indicator will reflect the
visitor's own state instead of the agent's.

**Offline banner**: `setShowOfflineBanner(true)` only enables the feature;
visibility comes from commercial presence (`usePresence`). Do not force the
banner on PENDING chats without an assigned agent (avoids false “Sin conexión”).

📖 **Full reference**: [`docs/PRESENCE_SYSTEMS.md`](docs/PRESENCE_SYSTEMS.md) —
covers REST endpoints, WebSocket events, state mapping, SDK wiring, and common
pitfalls for both systems.

## Site-entry → Console Pendientes

After successful `executeIdentify()`, if there is no open chat
(`PENDING` / `ASSIGNED` / `ACTIVE`), the SDK calls
`ChatV2Service.createChatAuto({ metadata: { source: 'sdk-site-entry', … } })`
→ `POST /v2/chats`. That empty PENDING chat appears in Console **Atención → Pendientes**.

On the visitor’s **first message**, show once:
`Hemos recibido tu mensaje. En breve te atenderemos.`
(sessionStorage key `guiders_wait_msg_{chatId}`).

## Commercial availability (tenant)

Driven by **manual** Console toggle (not inactivity cron):

- `POST /v2/commercials/availability` → `available` if `onlineCount ≥ 1`
- WS `commercial:availability-changed`
- Config `commercialAvailability.hideWhenUnavailable` (demo: `false` + system copy
  “Soporte conectado” / “Soporte no disponible”)

## Code Style Guidelines

### File Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| Services | `*-service.ts` | `websocket-service.ts` |
| Managers | `*-manager.ts` | `consent-manager.ts` |
| UI Components | `*-ui.ts` | `chat-ui.ts` |
| Types | `*-types.ts` | `websocket-types.ts` |
| Pipeline Stages | `*-stage.ts` | `validation-stage.ts` |
| Tests | `*.spec.ts` | `chat.spec.ts` |

### Naming Conventions
- **Classes**: PascalCase with descriptive suffix (`TrackingPixelSDK`, `WebSocketService`, `ConsentManager`)
- **Methods/Functions**: camelCase (`executeIdentify()`, `loadChatMessagesOnOpen()`)
- **Constants**: UPPER_SNAKE_CASE (`STORAGE_KEY`, `ACTIVITY_THROTTLE_MS`)
- **Interfaces/Types**: PascalCase with suffix (`SDKOptions`, `ConsentState`, `PixelEvent`)

### Import Patterns
```typescript
// Relative imports (NO path aliases like @/)
import { EndpointManager } from '../core/endpoint-manager';
import { debugLog, debugWarn, debugError } from '../utils/debug-logger';
import { ChatV2, ChatListV2 } from '../types';

// External dependencies
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
```

Rules:
- Use **relative paths** (`../`, `../../`) - no `@/` aliases
- Omit `.ts` extension (Webpack resolves)
- Prefer **named exports** over default exports
- Centralize types in `types/index.ts` with barrel exports

### TypeScript Configuration
- `strict: true` enabled - full type safety required
- Target ES6 for browser compatibility
- Generates `.d.ts` declarations

### Error Handling Patterns

**1. Validation stages - throw descriptive errors:**
```typescript
if (!event.type) {
    throw new Error('Event must have a type');
}
```

**2. Services - try-catch with silent logging:**
```typescript
try {
    const stored = localStorage.getItem(this.config.storageKey);
    return JSON.parse(stored) as ConsentState;
} catch (error) {
    debugError('[ConsentManager] Error loading state:', error);
    return null;
}
```

**3. Guards for early exit:**
```typescript
if (!this.socket?.connected) return;
```

**4. HTTP with re-auth:**
```typescript
if (response.status === 401) {
    const reauthed = await this.reAuthenticate();
    if (reauthed) response = await fetch(url, { ...options, headers: this.getAuthHeaders() });
}
```

### Logging Prefixes
Use standardized emoji prefixes:
- `🚀` init
- `📊` tracking
- `💬` chat
- `🔍` heuristic detection
- `📡` socket/WebSocket
- `🕐` active hours
- `❌` warnings/errors

### Singleton Pattern (used extensively)
```typescript
export class WebSocketService {
    private static instance: WebSocketService;
    private constructor() { /* ... */ }
    
    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }
}
```

## Architecture Rules

### Layer Separation (Critical)
- `core/` - Orchestration, state, managers. Minimize side effects.
- `pipeline/` - Immutable event processing. Only `side-effect-stage.ts` can do I/O.
- `services/` - Network + WebSocket. **Never import from `presentation/`**.
- `presentation/` - UI components (lazy-loaded). No token/session logic.
- `types/` - Centralized type definitions, exported via `types/index.ts`.

### Pipeline Stage Pattern
```typescript
class NewStage implements PipelineStage<Event, Event> {
    process(event: Event): Event {
        // PURE: No fetch, localStorage, DOM access
        return { ...event, enrichedField: 'value' };
    }
}
```
- Add stages BEFORE `validation-stage.ts` for enrichment
- Return `null` to abort pipeline (log reason)

### Key Architecture Patterns (from Copilot instructions)

**1. Endpoint Resolution** (`core/endpoint-resolver.ts`)
- Triple discovery: `window.GUIDERS_CONFIG` > env vars > fallback
- Query param `?dev` forces dev mode (default: production)
- Always use `EndpointManager.getInstance().getEndpoint()` - never hardcode IPs

**2. API Key Discovery** (priority order)
- Script tag: `<script data-api-key="...">`
- Query param: `?apiKey=...`
- Global: `window.GUIDERS_CONFIG.apiKey`

**3. Hybrid Communication Model**
- **Message SEND**: HTTP POST to `/v2/messages` (ChatV2Service)
- **Message RECEIVE**: WebSocket event `message:new`
- Separation ensures reliability + real-time updates

**4. WebSocket Filtering** (`realtime-message-manager.ts`)
- Automatically ignores messages where `senderId === visitorId` to prevent optimistic UI duplicates

**5. Active Hours** (`core/active-hours-validator.ts`)
- Timezone `'auto'` → detects via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Ranges can cross midnight (e.g., `22:00-06:00`)
- Validate **before** initializing chat UI

## Anti-Patterns (Reject in Review)
- I/O inside non-side-effect stages
- Network logic inside `presentation/`
- Duplicating types already defined in `types/`
- v1/v2 branching in UI (belongs in service adapters)
- Blocking init for recoverable errors
- Hardcoding endpoints (use `EndpointManager.getInstance()`)
- Multiple instances of Singletons (use `.getInstance()`)
- Importing `presentation/` from `services/` or `core/`

## Quick Debug
```javascript
console.log({
    tokens: TokenManager.hasValidTokens(),
    ws: window.guiders.webSocket?.isConnected(),
    chatVisible: window.guiders.chatUI?.isVisible(),
    heuristic: window.guiders.heuristicEnabled,
    activeHours: window.guiders.trackingPixelSDK.getActiveHoursConfig(),
    chatActive: window.guiders.trackingPixelSDK.isChatActive()
});
```
