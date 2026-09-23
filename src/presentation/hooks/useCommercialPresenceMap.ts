/**
 * useCommercialPresenceMap — keeps `commercialPresenceMapSignal` populated
 * with the live status of every commercial referenced by the chat list.
 *
 * Architecture: split into TWO hooks to handle different lifecycles:
 *
 *   1. `useCommercialPresenceWebSocket()` — subscribes to `presence:changed`.
 *      Must stay mounted at the WIDGET ROOT level (always alive while the
 *      widget exists) so updates are not lost while the panel is closed.
 *
 *   2. `useCommercialPresenceSeed({ chatIds })` — performs lazy REST
 *      `getChatPresence(chatId)` calls to seed the map for chats whose
 *      commercial isn't yet known. Optional; used if a surface lists chats.
 *
 *   3. `useCommercialPresenceMap({ chatIds })` — convenience wrapper that
 *      composes both. Kept for backward compatibility with the original
 *      single-call API.
 *
 * Why a per-commercial map instead of per-chat?
 *   - A single commercial may be assigned to multiple chats. Storing the
 *     status keyed by `commercialId` lets every list item that references
 *     that commercial reflect the same source of truth.
 */

import { useSignalEffect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { commercialPresenceMapSignal, presenceServiceSignal } from '../signals/presenceState';
import type { PresenceUiStatus } from '../types/presence-types';
import type { PresenceChangedEvent } from '../../types/presence-types';
import { debugError, debugLog } from '../../utils/debug-logger';

/**
 * Maps a raw server-side presence status to the UI-facing PresenceUiStatus.
 * Mirrors the helper in `usePresence.ts` — kept duplicated to avoid a
 * cross-hook import for a 6-line function.
 */
function toUiStatus(raw: string): PresenceUiStatus {
    switch (raw) {
        case 'online': return 'online';
        case 'away': return 'away';
        case 'busy':
        case 'chatting': return 'busy';
        default: return 'offline';
    }
}

/**
 * Subscribe to commercial presence changes via WebSocket. Updates the
 * `commercialPresenceMapSignal` on every event with `userType === 'commercial'`.
 *
 * IMPORTANT: this hook must be mounted in a component that lives for the
 * entire widget lifecycle (i.e. `ChatWidget` root). If mounted only while
 * the chat list view is visible, presence updates that arrive while the
 * list is hidden will be lost.
 */
export function useCommercialPresenceWebSocket(): void {
    useSignalEffect(() => {
        const service = presenceServiceSignal.value;
        if (!service) return;

        let unsubscribe: () => void = () => {};
        try {
            const result = service.onPresenceChanged((event: PresenceChangedEvent) => {
                if (event.userType !== 'commercial') return;
                const next = toUiStatus(event.status);
                const current = commercialPresenceMapSignal.peek();
                if (current[event.userId] === next) return; // no-op
                commercialPresenceMapSignal.value = {
                    ...current,
                    [event.userId]: next,
                };
                debugLog('[useCommercialPresenceWebSocket] update:', {
                    commercialId: event.userId.substring(0, 8) + '...',
                    next,
                });
            });
            if (typeof result === 'function') unsubscribe = result;
        } catch (err) {
            debugError('[useCommercialPresenceWebSocket] Failed to subscribe:', err);
        }

        return () => {
            try { unsubscribe(); } catch { /* noop */ }
        };
    });
}

export interface UseCommercialPresenceSeedOptions {
    /**
     * Chat IDs currently visible in the list. Each chat with an unknown
     * commercial will be REST-fetched once to seed the map.
     */
    chatIds: readonly string[];
}

/**
 * Lazily seed the presence map via REST `getChatPresence(chatId)` for every
 * chat in `chatIds` that hasn't been queried yet. Only fetches once per chat
 * id (memoized via internal ref). Safe to mount on a transient view.
 */
export function useCommercialPresenceSeed(options: UseCommercialPresenceSeedOptions): void {
    const { chatIds } = options;
    // Persist across this hook's lifetime. NOTE: when the hook unmounts and
    // remounts (e.g. user navigates away and back to the list), this set is
    // recreated — that's intentional, so a re-mount can refresh stale data.
    // The WebSocket map persists across mounts via the signal, so the dot
    // will show immediately from the cached value while REST refreshes.
    const seededChatsRef = useRef<Set<string>>(new Set());

    // Build a stable key for the dependency array. `chatIds` is a fresh array
    // on every render (built from `chats.map(c => c.id)` upstream), so we can't
    // use it directly as a dep. Sorting + joining gives us a stable signature
    // that only changes when the actual set of chat ids changes.
    const chatIdsKey = [...chatIds].sort().join('|');

    // IMPORTANT: this MUST be `useEffect`, not `useSignalEffect`. The latter
    // only re-runs when signals it READS change — but `chatIds` arrives as a
    // plain prop derived from `useChatList()`, not a signal we read here. On
    // first mount the chat list is empty (still loading), so a signal-only
    // effect would never re-fire when the chats actually arrive.
    useEffect(() => {
        const service = presenceServiceSignal.value;
        if (!service?.getChatPresence) return;

        const seeded = seededChatsRef.current;
        const toFetch = chatIds.filter((id) => !seeded.has(id));
        if (toFetch.length === 0) return;

        toFetch.forEach((chatId) => {
            seeded.add(chatId);
            service.getChatPresence!(chatId).then((presence) => {
                if (!presence?.participants) return;
                const commercials = presence.participants.filter(
                    (p) => p.userType === 'commercial'
                );
                if (commercials.length === 0) return;

                const current = commercialPresenceMapSignal.peek();
                const updates: Record<string, PresenceUiStatus> = {};
                let changed = false;
                for (const c of commercials) {
                    const next = toUiStatus(c.connectionStatus);
                    if (current[c.userId] !== next) {
                        updates[c.userId] = next;
                        changed = true;
                    }
                }
                if (changed) {
                    commercialPresenceMapSignal.value = { ...current, ...updates };
                    debugLog('[useCommercialPresenceSeed] REST seed:', {
                        chatId: chatId.substring(0, 8) + '...',
                        commercials: Object.keys(updates).length,
                    });
                }
            }).catch((err: unknown) => {
                debugError('[useCommercialPresenceSeed] REST seed failed for', chatId, err);
                // Allow retry on next render
                seeded.delete(chatId);
            });
        });
    }, [chatIdsKey]);
}

export interface UseCommercialPresenceMapOptions extends UseCommercialPresenceSeedOptions {}

/**
 * Convenience composition: subscribes to WS updates AND seeds via REST.
 *
 * @deprecated Prefer mounting `useCommercialPresenceWebSocket()` at the
 * widget root and `useCommercialPresenceSeed({ chatIds })` at the list view.
 * Mounting both in a transient view will lose WS updates received while the
 * view is unmounted.
 */
export function useCommercialPresenceMap(options: UseCommercialPresenceMapOptions): void {
    useCommercialPresenceWebSocket();
    useCommercialPresenceSeed(options);
}
