# Presence Systems — Guiders SDK

The SDK exposes **two independent presence systems** that answer different
business questions and must NOT be confused. Both rely on WebSocket for
real-time updates and REST for the initial snapshot.

---

## TL;DR

| | **Commercial Availability** | **Chat Presence** |
|---|---|---|
| **Question answered** | "Are there ANY agents online for this site?" | "What is the status of the agent assigned to THIS chat?" |
| **Scope** | Tenant-wide (site/account level) | Chat-specific (per conversation) |
| **Granularity** | Aggregate count + boolean | Per-participant status |
| **States** | `available: boolean` + `onlineCount: number` | `online \| away \| busy \| offline` per participant |
| **REST endpoint** | `POST /v2/commercials/availability` | `GET /presence/chat/{chatId}` |
| **WebSocket room** | `tenant:{tenantId}` | `visitor:{visitorId}` (auto-join) + `chat:{chatId}` |
| **WebSocket event** | `commercial:availability-changed` | `presence:changed` |
| **SDK service** | `CommercialAvailabilityService` | `PresenceService` |
| **UI consumer** | Pre-chat gate (show/hide widget, "Out of office" message) | In-chat header indicator (dot + "En línea/Ausente/...") |
| **Auth required** | No (public) | Yes (visitor session) |

---

## 1. Commercial Availability (Tenant-Wide)

Answers: **"Are there agents available right now to attend new visitors on this site?"**

Used to decide whether to show the chat widget at all, or display a fallback
message ("All our agents are offline, leave us a message").

### REST — Initial state

```http
POST /v2/commercials/availability
Content-Type: application/json

{ "domain": "example.com", "apiKey": "gds_xxx" }
```

Response:
```json
{
  "available": true,
  "onlineCount": 3,
  "siteId": "uuid-of-site",
  "timestamp": "2026-05-05T10:00:00.000Z"
}
```

No authentication required — this endpoint must work BEFORE the visitor session
exists, so the SDK can decide whether to bother initializing the chat at all.

### WebSocket — Real-time updates

1. SDK joins the tenant room after connection:
   ```
   socket.emit('tenant:join', { tenantId: '<tenantId>' })
   ```
2. Backend confirms with `tenant:joined`.
3. Backend pushes updates whenever ANY commercial connects/disconnects:
   ```json
   // event: commercial:availability-changed
   {
     "available": false,
     "onlineCount": 0,
     "tenantId": "uuid-of-tenant",
     "timestamp": "2026-05-05T10:05:00.000Z"
   }
   ```

### SDK Implementation

- **Service**: `src/services/commercial-availability-service.ts`
- **Setup**: `TrackingPixelSDK.initializeCommercialAvailability()` reads
  `tenantId` from `localStorage` (with `siteId` as fallback) and calls `start()`.
- **Re-join**: `WebSocketService` tracks `currentTenantId` and re-emits
  `tenant:join` on every reconnection automatically.
- **Polling deprecated**: `CommercialAvailabilityConfig.pollingInterval` is
  marked `@deprecated`. The service no longer polls — REST is used only for
  the initial snapshot, then WebSocket drives all subsequent updates.

### Subscribing from app code

```typescript
sdk.onCommercialAvailabilityChanged((event) => {
    if (!event.available) {
        // Hide widget or switch to offline form
    }
});
```

---

## 2. Chat Presence (Per-Conversation)

Answers: **"What is the connection status of the agent assigned to THIS specific chat?"**

Used to render the live status indicator inside the chat header (green dot +
"En línea", amber + "Ausente", red + "Ocupado", grey + "Desconectado").

### REST — Initial state

```http
GET /presence/chat/{chatId}
x-guiders-sid: <session-id>
```

Response:
```json
{
  "chatId": "uuid-of-chat",
  "participants": [
    {
      "userId": "uuid-of-commercial",
      "userType": "commercial",
      "connectionStatus": "online",
      "isTyping": false,
      "lastActivity": "2026-05-05T10:00:00.000Z",
      "name": "Carlos López",
      "avatar": "https://..."
    },
    {
      "userId": "uuid-of-visitor",
      "userType": "visitor",
      "connectionStatus": "online",
      "isTyping": false
    }
  ],
  "timestamp": "2026-05-05T10:00:00.000Z"
}
```

⚠️ **CRITICAL**: `participants` includes BOTH the visitor and the commercial.
Always filter by `userType === 'commercial'` before deriving the status to
display — otherwise the indicator will reflect the visitor's own state
(yourself) instead of the agent's.

### WebSocket — Real-time updates

The visitor auto-joins their personal room `visitor:{visitorId}` upon
connection. No explicit `room:join` emit is required.

When the assigned commercial changes state, the backend emits `presence:changed`
to BOTH rooms simultaneously:

**Via `visitor:{visitorId}` (global format — multiple chats):**
```json
{
  "userId": "uuid-of-commercial",
  "userType": "commercial",
  "status": "busy",
  "previousStatus": "online",
  "affectedChatIds": ["uuid-of-chat-1", "uuid-of-chat-2"],
  "timestamp": "2026-05-05T10:05:00.000Z"
}
```

**Via `chat:{chatId}` (granular format — single chat):**
```json
{
  "userId": "uuid-of-commercial",
  "userType": "commercial",
  "status": "offline",
  "previousStatus": "online",
  "chatId": "uuid-of-chat-1",
  "timestamp": "2026-05-05T10:05:00.000Z"
}
```

### Backend State Mapping

The backend exposes 5 raw states. The UI collapses them into 4:

| Backend `status`  | UI `PresenceUiStatus` | Color  | Label (ES)     |
|-------------------|----------------------|--------|----------------|
| `online`          | `online`             | Green  | "En línea"     |
| `away`            | `away`               | Amber  | "Ausente"      |
| `busy`            | `busy`               | Red    | "Ocupado"      |
| `chatting`        | `busy`               | Red    | "Ocupado"      |
| `offline`         | `offline`            | Grey   | "Desconectado" |

`chatting` collapses to `busy` because UX-wise both mean
"agent is occupied in another conversation".

### SDK Implementation

- **Service**: `src/services/presence-service.ts`
- **UI hook**: `src/presentation/hooks/usePresence.ts`
  - Filters WebSocket events by `event.userType === 'commercial'` to ignore
    the visitor's own presence changes.
  - Filters REST `participants` by `userType === 'commercial'` for the same
    reason. Defaults to `'offline'` if no commercial is assigned to the chat.
- **Mapping helper**: `toUiStatus(raw)` in `usePresence.ts` collapses
  `chatting → busy` and unknown values → `offline`.
- **UI rendering**: `CommercialAvatar.tsx` shows the dot (over the avatar) +
  status text below the agent name, both with `aria-live="polite"`.

### Subscribing from custom code

The presentation layer already wires this up via `usePresence`. To consume from
outside Preact, use the `PresenceService` directly:

```typescript
import { PresenceService } from 'guiders-pixel/dist';

const service = new PresenceService(visitorId, ws, ...);
const unsubscribe = service.onPresenceChanged((event) => {
    if (event.userType !== 'commercial') return; // Ignore self
    console.log('Agent status:', event.status);
});
```

---

## Common Pitfalls

### ❌ Confusing the two systems
- Showing the chat header status indicator as "offline" when there are no
  agents available site-wide → **Wrong**, that's a Commercial Availability
  concern. The chat header should reflect the assigned agent specifically.
- Hiding the widget because the assigned agent is `busy` in one conversation →
  **Wrong**, other agents may still be available. Use Commercial Availability
  for the gate decision.

### ❌ Forgetting to filter by `userType`
The visitor's own presence events flow through the same `presence:changed`
channel. Always check `event.userType === 'commercial'` in custom handlers,
or you'll see the indicator flip to YOUR status whenever you become idle.

### ❌ Including the visitor in `participants` aggregation
`GET /presence/chat/{chatId}` returns ALL participants including the visitor
itself (whose `connectionStatus` is always `online` because it's the one
making the request). Filter first, aggregate second.

### ❌ Polling Commercial Availability
The REST endpoint is for the initial snapshot only. The backend pushes all
subsequent updates via `commercial:availability-changed` on the
`tenant:{tenantId}` room. Polling adds load without value.

---

## Related Files

| File | Responsibility |
|---|---|
| `src/services/commercial-availability-service.ts` | Commercial availability — REST + WS |
| `src/services/presence-service.ts` | Chat presence — REST + WS |
| `src/services/websocket-service.ts` | `tenant:join`, `currentTenantId` re-join, callback merging |
| `src/types/websocket-types.ts` | `CommercialAvailabilityChangedEvent`, `WebSocketCallbacks` |
| `src/types/presence-types.ts` | `PresenceChangedEvent`, `ChatPresence`, `ChatParticipant` |
| `src/presentation/hooks/usePresence.ts` | UI hook with `userType === 'commercial'` filtering |
| `src/presentation/types/presence-types.ts` | `PresenceUiStatus`, `PresenceLike` |
| `src/presentation/components/PresenceIndicator/PresenceIndicator.tsx` | Dot + label component |
| `src/presentation/components/ChatHeader/CommercialAvatar.tsx` | Header avatar + status text |
| [`sdk-commercial-availability.md`](./sdk-commercial-availability.md) | Detailed availability integration guide |
| `docs/api/openapi.yaml` | Full API spec for both endpoints |
