# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Guiders SDK - Architecture Guide

This document provides essential context for AI agents working on this codebase.

## Project Overview

**Guiders SDK** is a JavaScript/TypeScript SDK for real-time visitor tracking, chat functionality, and GDPR-compliant consent management. It's designed to be embedded in client websites via a simple `<script>` tag.

**Core functionality**:
- Real-time visitor identification and tracking (fingerprinting)
- WebSocket-based chat system with typing indicators, read receipts, and file uploads
- GDPR-compliant consent management (granular: analytics, functional, personalization)
- Event pipeline for tracking user interactions (page views, custom events)
- Backend integration with Guiders platform API

## Build and Development

### Key Commands

```bash
# Development server (webpack dev server with hot reload)
npm start

# Production build
npm run build

# Testing
npm test                    # Run all Playwright tests
npm run test:ui            # Interactive test UI
npm run test:debug         # Run tests in debug mode
npm run test:headed        # Run tests with browser visible
npm run test:report        # Show last test report

# WordPress plugin release
npm run release:wp          # Build SDK + package plugin ZIP
npm run release:wp:skip     # Package plugin ZIP (skip build)
npm run release:wp:publish  # Full release: build + ZIP + git commit/tag/push
```

### Build Output

- **Production**: `dist/index.js` (UMD bundle, minified, TypeScript declarations included)
- **WordPress**: `wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.js` (copied from dist)
- Build tool: **Webpack 5** with TypeScript, production mode optimization

### Demo Environment

The SDK includes a PHP-based demo app at `demo/app/` for testing integration:
- GDPR consent banner (`demo/app/partials/gdpr-banner.php`)
- Example pages with tracking and chat
- Manual testing server: `php -S 127.0.0.1:8083 -t demo/app`
- Quick tests: `examples/quick-test.html`, `examples/websocket-realtime-chat-demo.html`

## Architecture

### High-Level Structure

```
src/
├── core/                        # Core SDK initialization and orchestration
│   ├── tracking-pixel-SDK.ts       # Main SDK class (entry point)
│   ├── consent-manager.ts          # Local consent state management
│   ├── session-tracking-manager.ts # Session lifecycle (prevents false session_end)
│   ├── heuristic-element-detector.ts # Intelligent element detection
│   ├── bot-detector.ts             # Bot detection before initialization
│   ├── active-hours-validator.ts   # Chat availability by schedule
│   ├── endpoint-resolver.ts        # Centralized endpoint configuration
│   └── token-manager.ts            # JWT token lifecycle (if authMode='jwt')
│
├── services/                    # Backend integrations and business logic
│   ├── visitors-v2-service.ts      # Visitor identification (fingerprinting)
│   ├── consent-backend-service.ts  # Consent API integration
│   ├── websocket-service.ts        # Socket.IO client (singleton)
│   ├── chat-v2-service.ts          # Chat API v2 with fallback to v1
│   ├── realtime-message-manager.ts # WebSocket message handling + deduplication
│   └── message-pagination-service.ts # Message history pagination
│
├── pipeline/                    # Event processing pipeline
│   ├── stages/                     # Immutable processing stages
│   │   ├── time-stamp-stage.ts
│   │   ├── token-injection-stage.ts
│   │   ├── session-injection-stage.ts
│   │   ├── validation-stage.ts
│   │   └── side-effect-stage.ts    # ONLY stage allowed to do I/O
│   └── event-pipeline.ts           # Pipeline orchestration
│
└── presentation/                # UI components (lazy-loaded)
    ├── components/
    │   ├── chat-ui.ts              # Main chat widget
    │   ├── chat-input-ui.ts        # Message input + file upload
    │   ├── chat-messages-ui.ts     # Message list renderer
    │   ├── message-renderer.ts     # Individual message formatting
    │   └── quick-actions-ui.ts     # Quick action buttons component
    ├── types/
    │   ├── chat-types.ts           # Chat type definitions
    │   └── quick-actions-types.ts  # Quick Actions type definitions
    └── consent-banner-ui.ts        # GDPR consent banner UI
```

### Key Design Patterns

#### 1. GDPR-First Architecture

**Principle**: Consent management is OPTIONAL by default. Sites can enable GDPR controls when needed.

**Implementation**:
- **ConsentManager** (`src/core/consent-manager.ts`): Manages consent state in localStorage
  - States: `pending`, `granted`, `denied`
  - Categories: `analytics`, `functional`, `personalization`
  - Emits events on state change

- **requireConsent Configuration** (`src/core/tracking-pixel-SDK.ts`):
  - **Default: `false`** - SDK initializes immediately without consent barriers
  - Set `requireConsent: true` to enforce GDPR consent requirements
  - When `false`: SDK sets `defaultStatus: 'granted'` automatically
  - When `true`: SDK waits for consent, shows banner (if configured)

- **Consent Banner** (`src/presentation/consent-banner-ui.ts`):
  - ONLY shown when `requireConsent: true` and `consentBanner.enabled: true`
  - Provides UI for users to grant/deny consent
  - Fully customizable via configuration

- **Automatic Consent Registration** (`src/services/visitors-v2-service.ts`):
  - Backend automatically registers ALL consents when `identify()` is called
  - Frontend sends `hasAcceptedPrivacyPolicy: true/false` in the identify payload
  - HTTP 200: Visitor with session, consent `granted`
  - HTTP 400: Anonymous visitor, consent `denied`

- **Consent Synchronization**:
  - For NEW visitors (consentAge < 5s): Backend has latest state
  - For RETURNING visitors (consentAge > 5s): Sync local state with backend

**Critical**: `requireConsent: false` (default) allows SDK to work globally without GDPR barriers. European sites should set `requireConsent: true`.

#### 2. Visitor Identity System

**Fingerprinting** (`src/services/visitors-v2-service.ts`):
- Uses ClientJS to generate browser fingerprint (canvas, WebGL, fonts, etc.)
- Stored in localStorage as `fingerprint`
- Sent to backend via `POST /visitors/v2/identify`
- Backend returns `visitorId` (UUID) which is stored and used for all subsequent API calls

**Identity Resolution**:
```
1. User visits site → SDK checks localStorage for fingerprint
2. If no fingerprint → SDK checks consent status (if requireConsent=true)
3. If consent pending (and required) → Wait for consent
4. If consent granted (or not required) → Generate fingerprint via ClientJS
5. Call identify() → Backend matches fingerprint to existing visitor or creates new
6. Store visitorId in localStorage
7. Use visitorId for all chat/events/consent operations
```

#### 3. Event Pipeline

**Purpose**: Reliable event delivery even with network failures.

**Flow**:
```
trackEvent() → EventPipeline.enqueue() → QueueSystem.add() → localStorage
                                       ↓
                                   (background)
                                       ↓
                              EventPipeline.flush()
                                       ↓
                            POST /events/v2/track-batch
                                       ↓
                              (on success) QueueSystem.remove()
```

**Features**:
- Persistent queue in localStorage (`guiders_event_queue`)
- Automatic retry with exponential backoff
- Batch processing (10 events per request, max 50KB payload)
- Fallback to `navigator.sendBeacon()` on page unload

**File**: `src/pipeline/event-pipeline.ts`

#### 4. Chat System

**WebSocket Client** (`src/services/websocket-service.ts`):
- Singleton Socket.IO client
- Connects to `wss://chat.guiders.app` (or configured endpoint)
- Handles:
  - Message sending (HTTP POST) + receiving (WebSocket)
  - Typing indicators
  - Read receipts
  - Room join/leave
  - Automatic reconnection
  - Dual authentication (JWT Bearer + HttpOnly cookies)

**Message Deduplication** (`src/services/realtime-message-manager.ts`):
- Filters out visitor's own messages from WebSocket (prevents duplicates)
- Visitor sees instant optimistic UI, WebSocket echo is ignored
- Only renders messages from commercials/bots/other participants

**API v2 with Fallback** (`src/services/chat-v2-service.ts`):
- Tries `/api/v2/chats` endpoints first
- Falls back to v1 endpoints if v2 unavailable
- Adapts response formats transparently
- Supports pagination, filters, metrics, assignment

**UI Components**:
- `ChatUI`: Main widget structure
- `ChatInputUI`: Message input with file upload
- `ChatMessagesUI`: Message list renderer
- `MessageRenderer`: Individual message formatting

**State Management**:
- Messages paginated and stored in `ChatMemoryStore`
- UI auto-scrolls on new message
- Welcome message shown on first open (localStorage flag)
- Active hours validation before showing chat

### API Integration

**Endpoint Resolution** (`src/core/endpoint-resolver.ts`):
- Centralized configuration via `EndpointManager` singleton
- Order: `window.GUIDERS_CONFIG` > environment vars > defaults
- Production: `https://app.guiders.app/api` and `wss://chat.guiders.app`
- Development: Detected by `?dev` query param in page or script URL
- Dev defaults: `http://localhost:3000/api` and `ws://localhost:3000`

**Authentication**:
- **Default mode: `session`** - HttpOnly cookie from `/api/visitors/identify`
- **Optional mode: `jwt`** - Bearer token from `/api/pixel/token`
- API Key in request body: `apiKey: "gds_xxx"`
- Visitor ID in header: `X-Guiders-SID: <visitorId>`

**Key Endpoints**:
- `POST /api/visitors/v2/identify` - Register/identify visitor
- `POST /api/events/v2/track-batch` - Send event batch
- `POST /api/consent/visitors/{id}` - Register consent
- `GET /api/consent/visitors/{id}` - Fetch consent status
- `POST /api/pixel/token` - Get JWT token (if authMode='jwt')
- Chat API v2: `/api/v2/chats/*` (with v1 fallback)
- WebSocket: `wss://chat.guiders.app` - Real-time chat

## Important Technical Decisions

### Why Automatic Consent Registration?

**Evolution**: The consent flow was simplified in January 2025 to reduce complexity and improve GDPR compliance.

**Old approach (deprecated)**:
- Backend registered only `privacy_policy` automatically
- Frontend manually registered `analytics` and `marketing` after identify
- Complex timing logic to avoid overwrites

**New approach (current)**:
- Backend automatically registers ALL consent preferences when `identify()` is called
- Frontend only sends `hasAcceptedPrivacyPolicy: true/false` in the identify payload
- Backend handles the rest: visitor creation, session management, and consent registration
- HTTP 200 (accepted) vs HTTP 400 (denied) clearly distinguish consent outcomes

**Mapping** (still used internally by backend):
- Frontend `functional` → Backend `privacy_policy`
- Frontend `analytics` → Backend `analytics`
- Frontend `personalization` → Backend `marketing`

**Benefits**:
- Simpler frontend code (no manual consent registration)
- Atomic operation (visitor + consent registered together)
- Better GDPR audit trail (consent recorded at visitor creation)
- Clearer error handling (HTTP 400 for denied consent is not a failure)

**Location**: `src/services/visitors-v2-service.ts`

### Why `requireConsent: false` by Default?

**Evolution**: Consent requirement changed from mandatory to optional in v1.2.3 (January 2025).

**Old approach (v1.2.2 and earlier)**:
- SDK always required consent before initialization
- ConsentPlaceholder component blocked chat UI
- Mandatory GDPR flow for all sites globally

**New approach (v1.2.3+)**:
- SDK initializes immediately by default (`requireConsent: false`)
- No consent barriers unless explicitly enabled
- GDPR controls opt-in via configuration

**Rationale**:
- **Global usability**: Sites outside EU don't need GDPR barriers
- **Easier onboarding**: SDK works immediately after installation
- **Flexibility**: Sites can enable GDPR when needed
- **Better UX**: Non-EU users don't see unnecessary consent prompts

**How to enable GDPR**:
```typescript
const sdk = new TrackingPixelSDK({
  apiKey: 'YOUR_API_KEY',
  requireConsent: true,  // Enable GDPR consent requirement
  consentBanner: {
    enabled: true  // Show consent banner UI
  }
});
```

**Location**: `src/core/tracking-pixel-SDK.ts`

### Why Automatic Version Synchronization?

**Evolution**: Consent version changed from hardcoded to auto-synchronized in v1.4.0 (October 2025).

**Old approach (v1.3.0 and earlier)**:

- Consent version was hardcoded: `version: '1.2.2-alpha.1'`
- Required manual updates with each release
- Frequent desync between SDK version and consent version
- Audit trail showed outdated versions

**New approach (v1.4.0+)**:

- Consent version auto-synchronized from `package.json`
- Webpack `DefinePlugin` injects `__SDK_VERSION__` at build time
- Zero maintenance: version updates automatically with releases
- Consistent audit trail across all components

**Implementation**:
```typescript
// webpack.config.js
new webpack.DefinePlugin({
  __SDK_VERSION__: JSON.stringify(packageJson.version),
})

// tracking-pixel-SDK.ts
this.consentManager = ConsentManager.getInstance({
  version: __SDK_VERSION__, // Auto-synced from package.json
  // ...
});
```

**Benefits**:

- **Accurate GDPR audit trail**: Consent records match actual SDK version
- **Zero maintenance**: No manual version updates needed
- **Prevents desync bugs**: Impossible to forget updating consent version
- **Better compliance**: Version history accurately reflects policy changes

**Location**: `webpack.config.js`, `src/globals.d.ts`, `src/core/tracking-pixel-SDK.ts`

### Why ClientJS for Fingerprinting?

**Alternatives considered**: FingerprintJS (commercial), custom solution.

**Why ClientJS**:
- Open source, lightweight
- Generates stable fingerprints across sessions
- Covers: canvas, WebGL, fonts, timezone, screen resolution, plugins, etc.
- Good enough accuracy for visitor identification (not security use case)

**Location**: `src/services/visitors-v2-service.ts`

### Why Session-Based Auth by Default?

**Evolution**: Auth mode changed from JWT-based to session-based in late 2024.

**Old approach**:
- SDK always requested JWT tokens via `/api/pixel/token`
- Tokens stored in localStorage
- Manual refresh logic with `/api/pixel/token/refresh`

**New approach**:
- **Default: `authMode: 'session'`** - Uses HttpOnly cookie from identify
- Optional: `authMode: 'jwt'` - Legacy JWT token mode
- Simplified token renewal (no refresh endpoint)

**Benefits**:
- **More secure**: HttpOnly cookies can't be accessed by JavaScript (XSS protection)
- **Simpler client code**: No token management needed
- **Better performance**: No localStorage reads/writes per request
- **Easier debugging**: No token expiration issues

**Location**: `src/core/tracking-pixel-SDK.ts`, `src/core/token-manager.ts`

### Why Heuristic Detection?

**Problem**: Manually adding `data-track-event` attributes to client websites is error-prone and requires HTML modifications.

**Solution**: Intelligent element detection using CSS patterns, text content, and context.

**Benefits**:
- **Zero HTML changes**: Works with existing markup
- **WordPress/CMS friendly**: No theme modifications needed
- **Auto-adapts**: Detects common e-commerce patterns automatically
- **Configurable**: Confidence thresholds and custom rules

**Method**: `enableAutomaticTracking()` (replaces legacy `enableDOMTracking()`)

**Location**: `src/core/heuristic-element-detector.ts`

## Important Development Patterns

### Pipeline Architecture

**Critical Rule**: Only `side-effect-stage.ts` can perform I/O (network, console, localStorage).

**Adding a New Pipeline Stage**:
1. Implement `PipelineStage<I, O>` interface
2. Keep stage pure (no side effects)
3. Return `null` to abort pipeline (document reason in log)
4. Add stage BEFORE `validation-stage.ts` for enrichment
5. Register in pipeline order

**Example**:
```typescript
class GeoEnrichmentStage implements PipelineStage<Event, Event> {
  process(event: Event): Event {
    // PURE: No fetch, no localStorage, no DOM
    return {
      ...event,
      geo: { /* derived from existing data */ }
    };
  }
}
```

### Bot Detection Pattern

**Always run before initialization**:
```typescript
const detector = new BotDetector();
const result = await detector.detect();
if (result.isBot) {
  console.log('❌ Bot detected, skipping SDK');
  return;
}
// Safe to initialize SDK
```

### Session Tracking

**Prevents false `session_end` events on page refresh**:
- Uses `SessionTrackingManager` with heartbeat
- Configurable inactivity timeout
- Test with `examples/quick-test.html`

### Adding a New Consent Category

1. Update `ConsentPreferences` in `src/core/types/consent-types.ts`:
   ```typescript
   export interface ConsentPreferences {
     analytics: boolean;
     functional: boolean;
     personalization: boolean;
     newCategory: boolean; // Add here
   }
   ```

2. Update mapping in `src/services/consent-backend-service.ts`:
   ```typescript
   const SDK_TO_BACKEND_TYPE_MAP: Record<string, BackendConsentType> = {
     'analytics': 'analytics',
     'functional': 'privacy_policy',
     'personalization': 'marketing',
     'newCategory': 'backend_type' // Add mapping
   };
   ```

3. Update banner UI: `demo/app/partials/gdpr-banner.php`

### Quick Actions System

**Purpose**: Provide configurable quick action buttons when chat opens (e.g., "Talk to a person", "Check pricing").

**Architecture**:
- **QuickActionsUI** (`src/presentation/components/quick-actions-ui.ts`): Standalone component
- **Types** (`src/presentation/types/quick-actions-types.ts`): Type definitions
- **Integration**: Embedded in ChatUI, callbacks wired to TrackingPixelSDK

**Action Types**:
| Type | Handler | Backend Notification |
|------|---------|---------------------|
| `send_message` | Sends message via `RealtimeMessageManager` | No |
| `request_agent` | Sends message + calls `/api/chats/{id}/request-agent` | Yes |
| `open_url` | Opens URL in new tab | No |
| `custom` | Calls `onCustomAction` callback | No |

**Configuration**:
```typescript
quickActions: {
  enabled: true,
  welcomeMessage: '¿En qué puedo ayudarte?',
  showOnFirstOpen: true,
  buttons: [
    { id: 'greet', label: 'Saludar', emoji: '👋', action: { type: 'send_message', payload: 'Hola' } },
    { id: 'agent', label: 'Persona real', emoji: '👤', action: { type: 'request_agent' } }
  ],
  onCustomAction: (buttonId, action) => { /* handle custom */ }
}
```

**Event Tracking**: All button clicks emit `quick_action_clicked` event with `buttonId`, `actionType`, `timestamp`.

**Test demo**: `demo/app/test-quick-actions.html`

### Adding WordPress Admin Configuration Fields

**CRITICAL**: When adding new configuration options to the WordPress admin panel, you MUST complete ALL 4 steps. Missing any step will cause the setting to not save properly.

#### Step 1: Register the Settings Field (class-guiders-admin.php)

In the `registerSettings()` method, add your field registration:

```php
// In registerSettings() method, find the appropriate section
add_settings_field(
    'my_new_setting',                              // Field ID
    __('Mi Nueva Configuración', 'guiders-wp-plugin'), // Label
    array($this, 'myNewSettingFieldCallback'),     // Callback method
    'guiders-settings-chat',                       // Page (tab)
    'guiders_my_section'                           // Section ID
);
```

#### Step 2: Create the Field Callback Method (class-guiders-admin.php)

Add the callback method that renders the HTML:

```php
/**
 * My new setting field callback
 */
public function myNewSettingFieldCallback() {
    $settings = get_option('guiders_wp_plugin_settings', array());

    // For checkbox:
    $enabled = isset($settings['my_new_setting']) ? $settings['my_new_setting'] : false;
    echo '<input type="checkbox" id="my_new_setting" name="guiders_wp_plugin_settings[my_new_setting]" value="1" ' . checked($enabled, true, false) . ' />';
    echo '<label for="my_new_setting">' . __('Descripción del checkbox', 'guiders-wp-plugin') . '</label>';

    // For text input:
    $value = isset($settings['my_text_setting']) ? $settings['my_text_setting'] : 'default';
    echo '<input type="text" id="my_text_setting" name="guiders_wp_plugin_settings[my_text_setting]" value="' . esc_attr($value) . '" class="regular-text" />';

    // For number input:
    $number = isset($settings['my_number_setting']) ? $settings['my_number_setting'] : 10;
    echo '<input type="number" id="my_number_setting" name="guiders_wp_plugin_settings[my_number_setting]" value="' . esc_attr($number) . '" min="1" max="100" />';
}
```

#### Step 3: Add Validation in validateSettings() (class-guiders-admin.php) - **CRITICAL!**

**This step is frequently forgotten and causes settings to not save!**

In the `validateSettings()` method, add validation for your new fields:

```php
// In validateSettings() method, before "return $validated;"

// For checkbox (uses $validateCheckbox helper):
$validated['my_new_setting'] = isset($input['my_new_setting']) ? $validateCheckbox($input['my_new_setting']) : false;

// For text field:
if (isset($input['my_text_setting'])) {
    $validated['my_text_setting'] = sanitize_text_field($input['my_text_setting']);
}

// For number field with range validation:
if (isset($input['my_number_setting'])) {
    $number = intval($input['my_number_setting']);
    $validated['my_number_setting'] = max(1, min(100, $number)); // Clamp between 1-100
}

// For textarea:
if (isset($input['my_textarea_setting'])) {
    $validated['my_textarea_setting'] = sanitize_textarea_field($input['my_textarea_setting']);
}
```

#### Step 4: Pass to Frontend Config (class-guiders-public.php)

If the setting needs to be passed to the JavaScript SDK:

```php
// Option A: Add directly to the config array in getConfig()
$config = array(
    // ... existing config ...
    'myNewSetting' => isset($this->settings['my_new_setting']) ? (bool)$this->settings['my_new_setting'] : false,
);

// Option B: Create a helper method for grouped settings
private function getMyFeatureConfig() {
    $enabled = isset($this->settings['my_feature_enabled']) ? (bool)$this->settings['my_feature_enabled'] : false;

    if (!$enabled) {
        return array('enabled' => false);
    }

    return array(
        'enabled' => true,
        'option1' => isset($this->settings['my_feature_option1'])
            ? $this->settings['my_feature_option1']
            : 'default',
        'option2' => isset($this->settings['my_feature_option2'])
            ? intval($this->settings['my_feature_option2'])
            : 10
    );
}

// Then in getConfig():
'myFeature' => $this->getMyFeatureConfig(),
```

#### Checklist for New Admin Settings

- [ ] Field registered with `add_settings_field()` in `registerSettings()`
- [ ] Callback method created (e.g., `mySettingFieldCallback()`)
- [ ] **Validation added in `validateSettings()`** (most common mistake!)
- [ ] Frontend config updated in `class-guiders-public.php` if needed
- [ ] Rebuild plugin: `bash wordpress-plugin/build-plugin.sh`

#### Common Pitfalls

1. **Checkbox not saving**: Missing validation in `validateSettings()`. Checkboxes need special handling because unchecked checkboxes don't submit any value.

2. **Default value not working**: Make sure to provide default in both the callback AND the validation.

3. **Setting resets on other tab save**: The `validateSettings()` function merges with existing settings, but only for fields that are validated. Always add validation for new fields.

**Files involved**:
- `wordpress-plugin/guiders-wp-plugin/includes/class-guiders-admin.php` - Admin UI and validation
- `wordpress-plugin/guiders-wp-plugin/includes/class-guiders-public.php` - Frontend config

### Active Hours Validation

**Configure chat availability by schedule**:
```typescript
window.GUIDERS_CONFIG = {
  activeHours: {
    enabled: true,
    timezone: 'auto',  // or 'Europe/Madrid'
    ranges: [
      { start: '08:00', end: '14:00' },
      { start: '15:00', end: '17:00' }
    ],
    fallbackMessage: 'Chat available 8-14h and 15-17h'
  }
};
```

**Test demos**: `demo/app/timezone-comparison.html`, `examples/timezone-auto-demo.html`

### WebSocket Message Handling

**Hybrid architecture**:
- **SEND**: HTTP POST to `/api/chats/{id}/messages`
- **RECEIVE**: WebSocket event `message:new`

**Deduplication**: `RealtimeMessageManager` filters visitor's own messages (prevents duplicates from WebSocket echo)

**Test demo**: `examples/websocket-realtime-chat-demo.html`

### Debugging Common Issues

**Check SDK state**:
```javascript
console.log({
  tokens: TokenManager.hasValidTokens(),
  ws: window.guiders.webSocket?.isConnected(),
  chatVisible: window.guiders.chatUI?.isVisible(),
  heuristic: window.guiders.heuristicEnabled,
  activeHours: window.guiders.trackingPixelSDK.getActiveHoursConfig(),
  chatActive: window.guiders.trackingPixelSDK.isChatActive(),
  consent: window.guiders.trackingPixelSDK.getConsentStatus()
});
```

**Check endpoint configuration**:
```javascript
import { resolveDefaultEndpoints } from '@/core/endpoint-resolver';
console.log(resolveDefaultEndpoints());
```

**Clear all SDK state**:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Testing Strategy

**Test Framework**: Playwright (E2E tests)

**Test Files**: Located in `tests/` directory

**Key Test Coverage**:
- SDK initialization and configuration
- Chat message loading and rendering
- WebSocket connection and message handling
- Consent flow (if enabled)
- Event tracking pipeline
- Session management

**Running Tests**:
```bash
npm test              # Run all tests
npm run test:ui       # Interactive UI mode (recommended for debugging)
npm run test:debug    # Step-by-step debugging
npm run test:headed   # See browser while testing
```

**Demo Server**: Tests require PHP demo server running on port 8083:
```bash
php -S 127.0.0.1:8083 -t demo/app
```

## File Naming Conventions

- **Services**: `*-service.ts` (e.g., `websocket-service.ts`)
- **Managers**: `*-manager.ts` (e.g., `session-tracking-manager.ts`)
- **UI Components**: `*-ui.ts` (e.g., `chat-ui.ts`)
- **Types**: `*-types.ts` (e.g., `websocket-types.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`

## Key Documentation Files

- `README.md` - User-facing SDK documentation with installation and features
- `docs/README.md` - **Índice único** de toda la documentación del repo
- `CLAUDE.md` - This file (architecture and development guide)
- `AGENTS.md` - Instructions for coding agents
- `.github/copilot-instructions.md` - Detailed development patterns for AI agents
- `docs/consent/GDPR_CONSENT.md` - Complete GDPR consent implementation guide
- `wordpress-plugin/WORDPRESS_GDPR_GUIDE.md` - WordPress-specific GDPR integration
- `docs/wordpress/` - Docker WP, active hours, auto-updates
- `docs/presence/PRESENCE_SYSTEMS.md` - Presence systems reference

## Key Dependencies

- **ClientJS** (`clientjs`): Browser fingerprinting for visitor identification
- **uuid**: UUID generation for visitor IDs and message IDs
- **socket.io-client**: WebSocket client for real-time chat
- **Webpack 5**: Build system (UMD bundle)
- **TypeScript**: Type safety and modern JavaScript features
- **Playwright**: E2E testing framework

## Performance Considerations

- **Bundle size**: ~330 KB (production build, optimized)
- **Lazy loading**: Chat UI components load on first interaction
- **Event batching**: Max 10 events per request, 50KB payload limit
- **WebSocket**: Single persistent Socket.IO connection (not polling)
- **localStorage**: Used for persistence (fingerprint, visitorId, consent state, event queue, chat history)
- **Session-based auth**: No token storage overhead (HttpOnly cookies)
- **Message pagination**: Efficient memory usage with cursor-based pagination

## Security Notes

- **API Keys**: Client-side keys (`gds_xxx`) are public by design (scoped to domain)
- **Session auth**: HttpOnly cookies prevent XSS token theft
- **CORS**: Backend validates origin headers
- **XSS Protection**: All user input sanitized before rendering
- **No sensitive data**: SDK never stores passwords, payment info, or PII beyond fingerprint
- **Bot detection**: Prevents SDK initialization for detected bots/crawlers

## WordPress Plugin Release Workflow

**Versioning**: Follow SemVer with pre-release stages: `alpha` → `beta` → `rc` → `stable`

**Automated Release** (recommended):
```bash
# Full workflow: build SDK + package plugin + commit + tag + push
bash wordpress-plugin/release-wp-publish.sh "chore(wp-plugin): release X.Y.Z-beta.N"
```

**GitHub Actions** (automatic):
- Detects version from git tag
- Validates tag matches plugin header version
- Generates changelog from `readme.txt`
- Packages and uploads ZIP to GitHub Release
- Marks pre-releases (`-alpha`, `-beta`, `-rc`) appropriately

**Plugin Update Checker**:
- Checks GitHub Releases every 12 hours
- **Stable releases**: Auto-detected, users get update notifications
- **Pre-releases**: NOT auto-detected (manual download only)
- Requires ZIP asset matching pattern `/guiders-wp-plugin.*\.zip$/i`

**Manual Steps** (if needed):
1. Update version in `wordpress-plugin/guiders-wp-plugin/guiders-wp-plugin.php` (header + constant)
2. Update `Stable tag` and changelog in `readme.txt`
3. Build SDK: `npm run build`
4. Copy bundle: `cp dist/index.js wordpress-plugin/guiders-wp-plugin/assets/js/guiders-sdk.js`
5. Run: `bash wordpress-plugin/build-plugin.sh` to generate ZIP
6. Commit, tag, and push

**Important**:
- Tag must match version exactly (e.g., tag `v1.2.3-beta.1` requires `Version: 1.2.3-beta.1`)
- Always include changelog entry with proper format
- Pre-release changelogs use `[ALPHA]`, `[BETA]`, `[RC]` prefixes
- GitHub Release MUST include ZIP asset for auto-updates to work

**See also**: `wordpress-plugin/PLUGIN_UPDATES.md`, `.github/copilot-instructions.md`

---

**Last updated**: 2025-10-15
**Current version**: 1.4.1

For SDK issues: https://github.com/RogerPugaRuiz/guiders-sdk/issues
