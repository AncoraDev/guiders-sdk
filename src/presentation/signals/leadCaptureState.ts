import { signal } from '@preact/signals';
import { ResolvedLeadCaptureFlow } from '../../types';

/** Guion resuelto para este sitio; null cuando no hay nada configurado. */
export const leadCaptureFlowSignal = signal<ResolvedLeadCaptureFlow | null>(
    null
);

/**
 * El asistente se ofrece en el hilo. Se activa cuando no hay comerciales
 * conectados o estamos fuera de horario, y solo si hay guion.
 */
export const leadCaptureActiveSignal = signal<boolean>(false);

/**
 * El visitante ya pulsó el CTA. Si un comercial se conecta a mitad del guion no
 * se le quita el asistente de debajo.
 */
export const leadCaptureStartedSignal = signal<boolean>(false);

/**
 * El visitante ha preferido escribir en vez de usar el asistente. Entonces el
 * hilo vuelve a la conversación normal, con su historial.
 */
export const leadCaptureVisitorWroteSignal = signal<boolean>(false);

const WROTE_STORAGE_PREFIX = 'guiders_lead_capture_wrote_';

/** Marca que el visitante escribió en este chat; sobrevive a un recargo. */
export function markLeadCaptureVisitorWrote(chatId: string | null): void {
    leadCaptureVisitorWroteSignal.value = true;
    if (!chatId) return;
    try {
        sessionStorage?.setItem(`${WROTE_STORAGE_PREFIX}${chatId}`, '1');
    } catch {
        // sessionStorage bloqueado: el hilo vuelve al asistente tras recargar.
    }
}

/** Recupera la marca al abrir un chat, para no esconder lo que ya escribió. */
export function hydrateLeadCaptureVisitorWrote(chatId: string | null): void {
    if (!chatId) {
        leadCaptureVisitorWroteSignal.value = false;
        return;
    }
    try {
        leadCaptureVisitorWroteSignal.value =
            sessionStorage?.getItem(`${WROTE_STORAGE_PREFIX}${chatId}`) === '1';
    } catch {
        leadCaptureVisitorWroteSignal.value = false;
    }
}
