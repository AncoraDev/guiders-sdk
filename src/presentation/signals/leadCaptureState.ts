import { computed, signal } from '@preact/signals';
import {
    LeadCaptureProgress,
    LeadCaptureStatus,
    ResolvedLeadCaptureFlow,
} from '../../types';
import { messagesSignal } from './messagesState';

/**
 * Sitio que ocupa el asistente en el chat. Un único valor manda sobre hilo,
 * composer y cabecera, así que las tres cosas nunca se contradicen:
 *
 * - `off`: chat normal, el guion no aparece.
 * - `offer`: tarjeta al final del hilo. Historial visible y composer utilizable.
 * - `thread`: el asistente es el hilo entero y el composer se bloquea.
 */
export type LeadCaptureMode = 'off' | 'offer' | 'thread';

/** Guion resuelto para este sitio; null cuando no hay nada configurado. */
export const leadCaptureFlowSignal = signal<ResolvedLeadCaptureFlow | null>(
    null
);

/** Progreso que traía el visitante al abrir este chat. */
export const leadCaptureStatusSignal = signal<LeadCaptureStatus>('none');

/**
 * El visitante está dentro del guion ahora mismo. Si un comercial se conecta a
 * mitad no se le quita el asistente de debajo.
 */
export const leadCaptureEngagedSignal = signal<boolean>(false);

/**
 * Comerciales disponibles en el tenant. `null` mientras no lo sabemos: una
 * disponibilidad sin respuesta no es lo mismo que no haber nadie, y enseñar el
 * asistente por ese hueco daría un parpadeo en cada carga.
 */
export const supportOnlineSignal = signal<boolean | null>(null);

/**
 * El progreso guardado ya se consultó para este chat. Hasta entonces no se
 * decide nada: si no, al recargar a media captación el modo se calcularía con
 * `status = 'none'` y el asistente desaparecería con el guion a medias.
 */
export const leadCaptureHydratedSignal = signal<boolean>(false);

/** Progreso recuperado para reanudar; lo escribe el bridge y lo lee el guion. */
export const leadCaptureResumeSignal = signal<LeadCaptureProgress | null>(null);

/**
 * La captación terminó. El resumen que guarda el backend queda en el hilo, así
 * que sobrevive a un recargo aunque no se pueda leer el progreso.
 */
export const leadCaptureCompletedSignal = computed<boolean>(() => {
    if (leadCaptureStatusSignal.value === 'completed') return true;
    return messagesSignal.value.some(
        (msg) =>
            msg.systemData?.action === 'lead_capture_submission' ||
            msg.systemData?.action === 'lead_capture_closed'
    );
});

/**
 * Hay conversación de verdad. Los avisos del sistema y del consentimiento no
 * cuentan: mismo criterio que el estado vacío del hilo.
 */
export const hasThreadHistorySignal = computed<boolean>(() =>
    messagesSignal.value.some(
        (msg) => msg.sender !== 'system' && msg.sender !== 'consent'
    )
);

export const leadCaptureModeSignal = computed<LeadCaptureMode>(() => {
    if (!leadCaptureFlowSignal.value?.flow) return 'off';
    if (!leadCaptureHydratedSignal.value) return 'off';
    if (leadCaptureCompletedSignal.value) return 'off';

    // Empezado es empezado: el guion se termina sin interrupciones aunque
    // entretanto se conecte alguien.
    if (leadCaptureEngagedSignal.value) return 'thread';

    const supportOnline = supportOnlineSignal.value;
    if (supportOnline === null) return 'off';

    // Con alguien atendiendo el chat es la vía principal, y el guion solo se
    // ofrece para rematar lo que quedó a medias.
    if (supportOnline) {
        return leadCaptureStatusSignal.value === 'in_progress' ? 'offer' : 'off';
    }

    // Sin nadie atendiendo el asistente es la única vía útil, pero no se tapa
    // una conversación que ya existe: ahí solo se ofrece.
    return hasThreadHistorySignal.value ? 'offer' : 'thread';
});

/** Atajo para los tres consumidores que solo miran si el hilo está tomado. */
export const leadCaptureOwnsThreadSignal = computed<boolean>(
    () => leadCaptureModeSignal.value === 'thread'
);

/** Otro chat, otra captación: el progreso se vuelve a consultar desde cero. */
export function resetLeadCaptureForChat(): void {
    leadCaptureStatusSignal.value = 'none';
    leadCaptureEngagedSignal.value = false;
    leadCaptureHydratedSignal.value = false;
    leadCaptureResumeSignal.value = null;
}

/** Progreso ya consultado: desde aquí el modo se puede calcular. */
export function hydrateLeadCaptureStatus(
    status: LeadCaptureStatus,
    progress: LeadCaptureProgress | null = null
): void {
    leadCaptureResumeSignal.value = progress;
    leadCaptureStatusSignal.value = status;
    leadCaptureHydratedSignal.value = true;
}

/** El visitante entra en el guion (pulsa el CTA o reanuda). */
export function markLeadCaptureEngaged(): void {
    leadCaptureEngagedSignal.value = true;
    if (leadCaptureStatusSignal.value === 'none') {
        leadCaptureStatusSignal.value = 'in_progress';
    }
}

/** Guion enviado: el chat vuelve a la normalidad y no se vuelve a ofrecer. */
export function markLeadCaptureCompleted(): void {
    leadCaptureStatusSignal.value = 'completed';
    leadCaptureEngagedSignal.value = false;
}
