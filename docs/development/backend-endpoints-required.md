# Backend Endpoints Required by the SDK

**Document purpose**: This document details all HTTP endpoints that the Guiders SDK calls,
comparing them against the current OpenAPI specification. It identifies endpoints that are
missing from the spec, endpoints that need to be documented, and any behavioral contracts
the backend must fulfill.

**Audience**: Backend team (NestJS)
**SDK version**: 1.6.0
**OpenAPI spec**: `docs/api/openapi.yaml`
**Date**: 2026-05-05

---

## Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Documented & correct | 22 | Endpoint exists in OpenAPI, SDK uses it correctly |
| 🔴 Missing from OpenAPI | 1 | SDK calls it in production but it has no spec entry |
| 🟡 Needs clarification | 1 | Endpoint exists but auth model differs from spec |

---

## 1. Endpoints Missing from the OpenAPI Spec

### 1.1 `POST /api/visitors/session/heartbeat` — **MISSING**

**Severity**: High — this endpoint is called in production every 30 seconds per active visitor session.

**Called from**: `src/services/visitors-v2-service.ts` — `heartbeat()` method

**Purpose**: Keeps the visitor backend session alive. Without regular heartbeats the backend
session expires prematurely, causing the visitor to lose their chat context and be re-identified
on their next action.

**HTTP contract as implemented in the SDK**:

```
POST /api/visitors/session/heartbeat
```

**Request headers**:
```
Content-Type: application/json
x-guiders-sid: <sessionId>        ← visitor session ID from sessionStorage
```

**Request body**:
```json
{
  "sessionId": "string",           ← required: backend session ID
  "activityType": "heartbeat"      ← optional: "heartbeat" | "user-interaction"
}
```

**Expected response**:
- `200 OK` — heartbeat acknowledged, session TTL reset
- `401` — session expired or invalid (SDK treats any non-2xx as a silent failure and logs a warning)

**SDK behavior on failure**: The SDK catches all exceptions and returns `false` without
rethrowing. A failed heartbeat does not interrupt the visitor session client-side; the
backend session may expire silently.

**Action required**:
1. Add `POST /api/visitors/session/heartbeat` to the OpenAPI spec with the request/response
   schema described above.
2. Confirm the backend already handles this endpoint (it appears to, since the SDK has been
   using it in production). If not, implement it.

---

## 2. Endpoints with Auth Model Discrepancy

### 2.1 `GET /api/v2/chats/visitor/{visitorId}/my-chat` — auth mismatch

**Severity**: Low — the SDK does **not** call this endpoint. This section documents why,
so the backend team understands the design boundary.

**OpenAPI definition**: Requires `Bearer` token or BFF session cookie. Returns chats of
the visitor that are **assigned to the authenticated commercial**.

**Why the SDK cannot use this**: The SDK operates in the visitor context and authenticates
via `x-guiders-sid` (visitor session header). The `/my-chat` endpoint requires commercial
authentication and is scoped to the commercial's own assigned chats — not to the visitor's
full chat history.

**Current SDK approach**: `getLatestVisitorChat()` calls
`GET /api/v2/visitors/{visitorId}/chats?limit=1` which accepts visitor session auth and
returns the visitor's own most recent chat.

**No action required** unless a dedicated visitor-scoped "get my latest chat" endpoint is
desired for performance optimization (would save the pagination overhead for a single record).

---

## 3. All Endpoints Used by the SDK (Reference)

### 3.1 Visitor Identity & Session

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/visitors/identify` | `x-guiders-sid` (optional on first call) | ✅ Spec matches |
| POST | `/api/visitors/session/end` | `x-guiders-sid` | ✅ Spec matches |
| POST | `/api/visitors/session/heartbeat` | `x-guiders-sid` | 🔴 Not in spec — see §1.1 |

### 3.2 Pixel / Metadata

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/api/pixel/metadata?apiKey=...` | None (public) | ✅ Spec matches |

### 3.3 Event Tracking

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/tracking-v2/events` | `x-guiders-sid` | ✅ Spec matches |

### 3.4 Chats V2 (visitor-scoped)

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/v2/chats` | `x-guiders-sid` | ✅ Spec matches — response is `{ chatId, position }` |
| POST | `/api/v2/chats/with-message` | `x-guiders-sid` | ✅ Spec matches |
| GET | `/api/v2/visitors/{visitorId}/chats` | `x-guiders-sid` | ✅ Spec matches |

### 3.5 Chats V2 (commercial-scoped, SDK utility methods)

> These methods exist in `ChatV2Service` but have no callers within the SDK.
> They are available for external consumers of the SDK or future features.

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/api/v2/commercials/{commercialId}/chats` | Bearer / BFF cookie | ✅ Spec matches |
| PUT | `/api/v2/chats/{chatId}/assign/{commercialId}` | Bearer / BFF cookie | ✅ Spec matches |
| GET | `/api/v2/chats/queue/pending` | Bearer / BFF cookie | ✅ Spec matches |

### 3.6 Chat Lifecycle

| Method | Path | Auth | Status |
|--------|------|------|--------|
| PUT | `/api/v2/chats/{chatId}/view-open` | `x-guiders-sid` | ✅ Spec matches |
| PUT | `/api/v2/chats/{chatId}/view-close` | `x-guiders-sid` | ✅ Spec matches |
| POST | `/api/v2/chats/{chatId}/request-agent` | `x-guiders-sid` | ✅ Spec matches |

### 3.7 Messages V2

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/v2/messages` | `x-guiders-sid` | ✅ Spec matches |
| GET | `/api/v2/messages/chat/{chatId}` | `x-guiders-sid` | ✅ Spec matches |
| GET | `/api/v2/messages/chat/{chatId}/unread` | `x-guiders-sid` | ✅ Spec matches |
| PUT | `/api/v2/messages/mark-as-read` | `x-guiders-sid` | ✅ Spec matches |

### 3.8 Commercial Availability

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/v2/commercials/availability` | `x-guiders-sid` | ✅ Spec matches |

### 3.9 Presence

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/api/presence/chat/{chatId}` | `x-guiders-sid` | ✅ Spec matches |
| POST | `/api/presence/chat/{chatId}/typing/start` | `Content-Type` only | ✅ Spec matches |
| POST | `/api/presence/chat/{chatId}/typing/stop` | `Content-Type` only | ✅ Spec matches |

### 3.10 Consents

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/consents/revoke` | `X-Guiders-Sid` | ✅ Spec matches |
| POST | `/api/consents/renew` | `X-Guiders-Sid` | ✅ Spec matches |
| GET | `/api/consents/visitors/{visitorId}` | `X-Guiders-Sid` | ✅ Spec matches |
| GET | `/api/consents/visitors/{visitorId}/audit-logs` | `X-Guiders-Sid` | ✅ Spec matches |

---

## 4. Endpoints Removed from the SDK

The following endpoint was previously called by the SDK and has been removed because
it does not exist in the OpenAPI specification:

| Method | Path | Removed in | Reason |
|--------|------|------------|--------|
| POST | `/api/consents/grant` | SDK 1.6.0 | Endpoint does not exist in the OpenAPI spec. The backend creates consents automatically during visitor identification (`POST /api/visitors/identify`). The `grantConsents()` method in `ConsentBackendService` was dead code with no callers — it has been deleted. |

---

## 5. Recommended Actions for the Backend Team

### Priority 1 — Document the heartbeat endpoint (required)

Add the following entry to `docs/api/openapi.yaml` under tag `visitors`:

```yaml
/api/visitors/session/heartbeat:
  post:
    summary: Mantener sesión de visitante activa
    description: >-
      Renueva el TTL de la sesión de un visitante. Llamado periódicamente por el SDK
      (cada 30 segundos) mientras el visitante está activo en la página.
    operationId: visitors_heartbeat
    tags:
      - visitors
    parameters:
      - name: x-guiders-sid
        in: header
        required: true
        schema:
          type: string
        description: Session ID del visitante
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - sessionId
            properties:
              sessionId:
                type: string
                description: ID de sesión backend del visitante
                example: "sess_1758226307441_visitor"
              activityType:
                type: string
                enum: [heartbeat, user-interaction]
                description: Tipo de actividad que origina el heartbeat
                example: "heartbeat"
    responses:
      '200':
        description: Sesión renovada exitosamente
      '401':
        description: Sesión inválida o expirada
    security:
      - x_guiders_sid: []
```

### Priority 2 — Confirm or implement `POST /api/consents/grant`

The previous SDK implementation attempted to call `POST /api/consents/grant`. This has
been removed because:
1. The endpoint does not exist in the OpenAPI spec.
2. The backend is expected to create consents automatically during `POST /api/visitors/identify`.

**Backend team should confirm**: Is explicit consent granting needed as a separate operation
(e.g., when the visitor accepts a cookie banner after initial identification)? If so, implement
and document the endpoint. If not, confirm the current `identify` + `renew` flow covers all
consent update scenarios.
