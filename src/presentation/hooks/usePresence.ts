/**
 * usePresence — subscribes to the PresenceLike provider stored in
 * `presenceServiceSignal` and mirrors its events into `presenceStatusSignal`
 * and `showOfflineBannerSignal`.
 *
 * Patches:
 *   #11 (Chunk 2) — uses `useSignalEffect` so the hook re-subscribes when the
 *        SDK lazily injects (or replaces) the PresenceService instance after
 *        auth completes. Reading `presenceServiceSignal.value` at the top of a
 *        plain function would only capture the value at first render and
 *        wouldn't react to later writes if the @preact/signals integration
 *        wasn't active for the host component.
 *   #12 (Chunk 2) — wraps `service.onPresenceChanged(...)` in try/catch and
 *        validates that the returned unsubscribe handle is callable. A
 *        synchronous throw on subscribe (or a non-function return value) would
 *        otherwise crash the cleanup chain on unmount.
 *   #13 (Chunk 2 — folded in) — dropped the misleading
 *        `eslint-disable react-hooks/exhaustive-deps` comment that no longer
 *        applies once we use `useSignalEffect`.
 */

import { useSignalEffect } from '@preact/signals';
import {
    presenceStatusSignal,
    showOfflineBannerSignal,
    offlineBannerEnabledSignal,
    chatIdSignal,
} from '../signals/chatState';
import { presenceServiceSignal } from '../signals/presenceState';
import type { PresenceUiStatus } from '../types/presence-types';
import type { PresenceChangedEvent } from '../../types/presence-types';
import { debugError, debugLog } from '../../utils/debug-logger';

/**
 * Maps a raw server-side presence status to the UI-facing PresenceUiStatus.
 * 'chatting' is treated as 'busy' — agent is occupied in another conversation.
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

export function usePresence(): void {
    useSignalEffect(() => {
        const service = presenceServiceSignal.value; // tracked
        if (!service) return;

        let unsubscribe: () => void = () => {};
        try {
            const result = service.onPresenceChanged((event: PresenceChangedEvent) => {
                // Only react to commercial (agent) presence changes — never to
                // the visitor's own presence. Otherwise the indicator would
                // mirror MY status instead of the agent's.
                if (event.userType !== 'commercial') {
                    return;
                }
                const next: PresenceUiStatus = toUiStatus(event.status);
                debugLog('[usePresence] Commercial presence changed:', {
                    userId: event.userId.substring(0, 8) + '...',
                    status: event.status,
                    next,
                });
                presenceStatusSignal.value = next;
                if (offlineBannerEnabledSignal.value) {
                    showOfflineBannerSignal.value = next === 'offline';
                }
            });
            if (typeof result === 'function') {
                unsubscribe = result;
            } else {
                debugError(
                    '[usePresence] onPresenceChanged did not return an unsubscribe function'
                );
            }
        } catch (err) {
            debugError('[usePresence] Failed to subscribe to PresenceService:', err);
        }

        // Fetch initial presence state via REST so the indicator is correct
        // immediately — WebSocket only fires on *changes*, not on connect.
        if (service.getChatPresence) {
            const chatId = chatIdSignal.peek();
            if (chatId) {
                service.getChatPresence(chatId).then((presence) => {
                    if (!presence) return;
                    // Only consider commercial participants — the visitor's own
                    // presence must NOT drive the indicator.
                    const commercials = presence.participants?.filter(
                        (p) => p.userType === 'commercial'
                    ) ?? [];
                    if (commercials.length === 0) {
                        // Chat sin comercial asignado / sin agentes en Redis:
                        // no forzar "offline" + banner "Sin conexión" (falso
                        // negativo histórico). El backend ya incluye disponibles
                        // en PENDING; si aún así viene vacío, esperar eventos WS.
                        debugLog(
                            '[usePresence] No commercial participants — not forcing offline banner'
                        );
                        return;
                    }
                    const anyOnline = commercials.some(
                        (p) => p.connectionStatus === 'online'
                    );
                    const bestRaw = commercials.find(
                        (p) => p.connectionStatus !== 'offline'
                    )?.connectionStatus ?? 'offline';
                    const next: PresenceUiStatus = anyOnline ? 'online' : toUiStatus(bestRaw);
                    debugLog('[usePresence] Initial commercial presence from REST:', next);
                    presenceStatusSignal.value = next;
                    if (offlineBannerEnabledSignal.value) {
                        showOfflineBannerSignal.value = next === 'offline';
                    }
                }).catch((err: unknown) => {
                    debugError('[usePresence] getChatPresence initial fetch failed:', err);
                });
            }
        }

        return () => {
            try {
                unsubscribe();
            } catch (err) {
                debugError('[usePresence] Error during unsubscribe:', err);
            }
        };
    });
}
