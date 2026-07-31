/**
 * usePresence — mirrors PresenceService events into presence signals.
 *
 * Reglas de producto:
 * - 0 agentes online → presence offline → icono estándar + aviso en header.
 * - 2+ comerciales inactivos → igual (offline).
 * - 1 activo aunque NO sea el asignado → soporte online,
 *   pero header con icono estándar (no avatar del asignado offline).
 * - Asignado online → avatar del comercial + indicador de presencia.
 */

import { useSignalEffect } from '@preact/signals';
import {
    presenceStatusSignal,
    assignedPresenceStatusSignal,
    showOfflineBannerSignal,
    offlineBannerEnabledSignal,
    chatIdSignal,
    chatDetailSignal,
} from '../signals/chatState';
import { presenceServiceSignal } from '../signals/presenceState';
import type { PresenceUiStatus } from '../types/presence-types';
import type { PresenceChangedEvent } from '../../types/presence-types';
import { debugError, debugLog } from '../../utils/debug-logger';

const TENANT_AVAILABILITY_ID = 'tenant-availability';

function toUiStatus(raw: string): PresenceUiStatus {
    switch (raw) {
        case 'online': return 'online';
        case 'away': return 'away';
        case 'busy':
        case 'chatting': return 'busy';
        default: return 'offline';
    }
}

function applySupportPresence(next: PresenceUiStatus): void {
    presenceStatusSignal.value = next;
    // El aviso de "sin agentes" vive en el header; no duplicamos con OfflineBanner.
    if (offlineBannerEnabledSignal.value && next !== 'offline') {
        showOfflineBannerSignal.value = false;
    }
}

function getAssignedId(): string | null {
    return (
        chatDetailSignal.peek()?.assignedCommercial?.id ??
        chatDetailSignal.peek()?.assignedCommercialId ??
        null
    );
}

function resolveFromParticipants(
    commercials: Array<{ connectionStatus: string; userId: string }>,
    assignedId: string | null,
): { support: PresenceUiStatus; assigned: PresenceUiStatus | null } {
    if (commercials.length === 0) {
        return { support: 'offline', assigned: assignedId ? 'offline' : null };
    }

    let assigned: PresenceUiStatus | null = null;
    if (assignedId) {
        const row = commercials.find((c) => c.userId === assignedId);
        assigned = row ? toUiStatus(row.connectionStatus) : 'offline';
    }

    if (assigned && assigned !== 'offline') {
        return { support: assigned, assigned };
    }

    const anyOnline = commercials.find((c) => c.connectionStatus === 'online');
    if (anyOnline) {
        return { support: 'online', assigned };
    }

    const nonOffline = commercials.find((c) => c.connectionStatus !== 'offline');
    return {
        support: nonOffline ? toUiStatus(nonOffline.connectionStatus) : 'offline',
        assigned,
    };
}

function applyResolved(support: PresenceUiStatus, assigned: PresenceUiStatus | null): void {
    applySupportPresence(support);
    assignedPresenceStatusSignal.value = assigned;
}

export function usePresence(): void {
    useSignalEffect(() => {
        const service = presenceServiceSignal.value;
        if (!service) return;

        let unsubscribe: () => void = () => {};

        const refreshFromRest = (): void => {
            if (!service.getChatPresence) return;
            const chatId = chatIdSignal.peek();
            if (!chatId) return;

            const assignedId = getAssignedId();

            service.getChatPresence(chatId).then((presence) => {
                if (!presence) return;
                const commercials = presence.participants?.filter(
                    (p) => p.userType === 'commercial'
                ) ?? [];
                if (commercials.length === 0) {
                    // Sin participantes comerciales en el mapa: si no hay asignado,
                    // no forzar offline (availability tenant puede seguir activa).
                    if (assignedId) {
                        assignedPresenceStatusSignal.value = 'offline';
                    }
                    debugLog(
                        '[usePresence] No commercial participants in chat presence map'
                    );
                    return;
                }
                const resolved = resolveFromParticipants(commercials, assignedId);
                debugLog('[usePresence] Presence from REST:', resolved);
                applyResolved(resolved.support, resolved.assigned);
            }).catch((err: unknown) => {
                debugError('[usePresence] getChatPresence failed:', err);
            });
        };

        try {
            const result = service.onPresenceChanged((event: PresenceChangedEvent) => {
                if (event.userType !== 'commercial') {
                    return;
                }

                // Availability a nivel tenant (onlineCount >= 1 / 0)
                if (event.userId === TENANT_AVAILABILITY_ID) {
                    if (event.status === 'offline') {
                        debugLog('[usePresence] Tenant availability → offline');
                        applyResolved('offline', getAssignedId() ? 'offline' : null);
                    } else {
                        debugLog('[usePresence] Tenant availability → online');
                        applySupportPresence(toUiStatus(event.status));
                        // No marcar al asignado online solo por tenant availability
                    }
                    return;
                }

                const assignedId = getAssignedId();

                if (event.status === 'offline') {
                    debugLog('[usePresence] Commercial offline — revalidando');
                    if (assignedId && event.userId === assignedId) {
                        assignedPresenceStatusSignal.value = 'offline';
                    }
                    refreshFromRest();
                    return;
                }

                // Online/away/busy del asignado
                if (assignedId && event.userId === assignedId) {
                    const next = toUiStatus(event.status);
                    debugLog('[usePresence] Assigned commercial presence:', next);
                    applyResolved(next, next);
                    return;
                }

                // Otro comercial online → soporte sí, avatar del asignado no
                if (event.status === 'online') {
                    debugLog('[usePresence] Otro comercial online — soporte disponible');
                    applySupportPresence('online');
                    if (assignedId && assignedPresenceStatusSignal.peek() == null) {
                        assignedPresenceStatusSignal.value = 'offline';
                    }
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

        refreshFromRest();

        return () => {
            try {
                unsubscribe();
            } catch (err) {
                debugError('[usePresence] Error during unsubscribe:', err);
            }
        };
    });
}
