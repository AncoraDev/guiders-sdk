import { signal } from '@preact/signals-core';
import type { QuickActionType, QuickActionSendPayload } from '../types/quick-actions-types';

/**
 * Action signals — written by UI components, observed by ChatUIBridge effects.
 *
 * Convention:
 *   - Nullable payload signals: UI sets value, bridge resets to null after handling.
 *   - Pulse counter signals: UI increments by 1, bridge reacts to any change.
 */

/** Emitted when the visitor switches to another existing chat (API interna). */
export const chatSwitchRequestSignal = signal<string | null>(null);

/**
 * Emitted when the visitor sends a message via a Quick Action button.
 *
 * Patch #29 (Chunk 2): the `QuickActionSendPayload` interface was moved to
 * `../types/quick-actions-types`. This file holds only the signal.
 */
export const quickActionSendMessageSignal = signal<QuickActionSendPayload | null>(null);

/** Incremented when the visitor taps "request agent" Quick Action. */
export const quickActionRequestAgentSignal = signal<number>(0);

/**
 * Patch #10 (Chunk 2): strongly-typed payload for Quick-Action tracking.
 * Producer: `QuickActions.tsx`. Consumer: `ChatUIBridge.ts`.
 *
 * The bridge widens this back to `Record<string, unknown>` when invoking
 * `onTrackQuickAction` — that boundary type is preserved to avoid breaking
 * `TrackingPixelSDK.ts:1020` (which is out-of-scope per PRD line 146).
 */
export interface QuickActionTrackPayload {
    readonly buttonId: string;
    readonly actionType: QuickActionType;
}

/** Emitted when any Quick Action is tracked (analytics). */
export const trackQuickActionSignal = signal<QuickActionTrackPayload | null>(null);

/** Incremented each time the chat UI finishes its own initialisation. */
export const chatInitializedSignal = signal<number>(0);
