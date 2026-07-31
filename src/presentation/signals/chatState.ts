import { signal, computed } from '@preact/signals';
import { ChatV2 } from '../../types';
import { ChatStatus } from '../../types/websocket-types';
import type { PresenceUiStatus } from '../types/presence-types';

/**
 * chatState — reactive signals describing the current chat session.
 *
 * Patch #9 (Chunk 2) — interim documentation pass.
 * The full mutable→ReadonlySignal split is deferred (see deferred-work.md).
 * Until then, every signal is annotated with its allowed writers so reviewers
 * can mechanically catch layering violations:
 *
 *   `@writer bridge`            — only `ChatUIBridge` may mutate this signal.
 *   `@writer hooks`             — only presentation hooks may mutate this signal.
 *   `@writer ui`                — UI components may mutate (toggles, etc.).
 *   `@writer bridge|hooks|ui`   — combinations are allowed and listed.
 *
 * Mutating a signal from a layer that is NOT in its `@writer` list is a bug.
 */

// ---------------------------------------------------------------------------
// Bridge-write-only — derived from external state (websocket, API, options)
// ---------------------------------------------------------------------------

/** @writer bridge — mirror of the active chat ID. */
export const chatIdSignal = signal<string | null>(null);

/** @writer bridge — mirror of the visitor identity. */
export const visitorIdSignal = signal<string | null>(null);

/** @writer bridge — full ChatV2 record for the active chat. */
export const chatDetailSignal = signal<ChatV2 | null>(null);

/** @writer bridge — last status received from the server. */
export const lastKnownChatStatusSignal = signal<ChatStatus | null>(null);

/** @writer bridge — whether the multi-chat selector is enabled (set via SDK option). */
export const chatSelectorEnabledSignal = signal<boolean>(false);

/** @writer bridge — timestamp of the last manual close (auto-open throttle). */
export const lastManualCloseTimestampSignal = signal<number>(0);

// ---------------------------------------------------------------------------
// Bridge + UI — UI components also mutate (toggle/open/close)
// ---------------------------------------------------------------------------

/** @writer bridge|ui — visibility of the chat panel (toggled by ToggleButton/ChatHeader). */
export const isVisibleSignal = signal<boolean>(false);

/** @writer bridge|ui — chat-list view visibility (toggled by ChatHeader/ChatListView). */
export const isShowingChatListSignal = signal<boolean>(false);

/** @writer bridge — pending message-create POST flag. */
export const isCreatingChatSignal = signal<boolean>(false);

// ---------------------------------------------------------------------------
// Bridge + hooks — both layers contribute writes
// ---------------------------------------------------------------------------

/** @writer bridge|hooks — initial-message-load spinner; written by usePagination + bridge. */
export const isLoadingInitialMessagesSignal = signal<boolean>(false);

/**
 * @writer bridge|hooks — soporte humano disponible en el chat
 * (comercial asignado u otro comercial online del tenant).
 * Escrito por usePresence + bridge resets. Drive el banner offline.
 */
export const presenceStatusSignal = signal<PresenceUiStatus>('offline');

/**
 * @writer hooks — presencia del comercial asignado (null si no hay asignado).
 * El header muestra avatar humano solo si esto no es offline.
 */
export const assignedPresenceStatusSignal = signal<PresenceUiStatus | null>(null);

/** @writer bridge|hooks — offline banner visibility; written by usePresence + bridge config. */
export const showOfflineBannerSignal = signal<boolean>(false);

/** @writer bridge — visitor opt-in for the offline banner feature. */
export const offlineBannerEnabledSignal = signal<boolean>(true);

/** @writer bridge — typing indicator visibility (commercial typing). */
export const isTypingSignal = signal<boolean>(false);

// ---------------------------------------------------------------------------
// Hook-write-only
// ---------------------------------------------------------------------------

/**
 * Patch #2 (Chunk 2) — surface pagination errors to the UI.
 * `'initial'` — failure loading the most-recent page (e.g. on chat open).
 * `'older'`   — failure loading older messages (scroll-to-top).
 * `null`      — no error / cleared.
 *
 * @writer hooks — written exclusively by usePagination; read by ChatMessages.
 */
export const paginationErrorSignal = signal<'initial' | 'older' | null>(null);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Milliseconds to block auto-open after the visitor manually closes the chat.
 *
 * Patch #18 (Chunk 2): documented enforcement contract.
 *
 * Enforced by ChatUIBridge: when an auto-open trigger fires (e.g. from
 * UnreadMessagesService.onMessageReceived), the bridge compares
 * `Date.now() - lastManualCloseTimestampSignal.value` against this constant
 * and suppresses the open if the difference is smaller.
 *
 * @see lastManualCloseTimestampSignal
 * @see src/presentation/bridge/ChatUIBridge.ts
 */
export const AUTO_OPEN_BLOCK_MS = 5_000;

// ---------------------------------------------------------------------------
// Patch #13 — configurable UI texts (bridge-write-only, set from SDK options)
// ---------------------------------------------------------------------------

/** @writer bridge — text shown in the offline banner. */
export const offlineBannerTextSignal = signal<string>(
    'Agente desconectado — te responderemos en cuanto vuelva'
);

/** @writer bridge — placeholder shown in the chat input textarea. */
export const chatInputPlaceholderSignal = signal<string>('Escribe un mensaje...');

// ---------------------------------------------------------------------------
// Computed views
// ---------------------------------------------------------------------------

/** Read-only — true if there is an assigned commercial with an ID. */
export const hasAssignedCommercialSignal = computed(
    () => !!(chatDetailSignal.value?.assignedCommercial?.id)
);
