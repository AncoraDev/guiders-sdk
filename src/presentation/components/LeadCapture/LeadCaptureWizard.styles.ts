// LeadCaptureWizard.styles.ts — asistente de captación, solo tokens --gds-*.
import type { h } from 'preact';
import { cardStyle } from '../ChatMessages/ContactRequestCard.styles';

type CSS = h.JSX.CSSProperties;

export const wizardCardStyle: CSS = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-2, 8px)',
};

/**
 * Cuando el asistente es lo único del hilo la tarjeta se centra, en vez de
 * quedar pegada al lado izquierdo como una burbuja más de la conversación.
 */
export function centerCard(base: CSS): CSS {
    return {
        ...base,
        alignSelf: 'center',
        width: '100%',
        maxWidth: '320px',
        margin: '0 auto',
    };
}

/** Contenedor del hilo cuando solo está el asistente: tarjeta centrada. */
export const centeredThreadStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    position: 'relative',
};

/** `margin: auto` centra en vertical sin recortar si la tarjeta crece. */
export const centeredThreadInnerStyle: CSS = {
    margin: 'auto',
    width: '100%',
    padding: 'var(--gds-spacing-4, 16px) 0',
};

export const promptStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-sm, 13px)',
    color: 'var(--gds-color-text)',
    lineHeight: 'var(--gds-line-height-normal, 1.5)',
    whiteSpace: 'pre-wrap',
};

export const introBodyStyle: CSS = {
    ...promptStyle,
    color: 'var(--gds-color-text-secondary)',
};

export const optionsColumnStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-2, 8px)',
    marginTop: 'var(--gds-spacing-2, 8px)',
};

export const recapListStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-1, 4px)',
    margin: '0 0 var(--gds-spacing-3, 12px)',
    padding: '0 0 var(--gds-spacing-3, 12px)',
    borderBottom: '1px solid var(--gds-color-border)',
};

export const recapItemStyle: CSS = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 'var(--gds-spacing-1, 4px)',
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-tertiary)',
    lineHeight: 'var(--gds-line-height-normal, 1.5)',
};

/** El check da por cerrado lo ya contestado, sin repetir la pregunta entera. */
export const recapCheckStyle: CSS = {
    flexShrink: 0,
    color: 'var(--gds-color-success)',
    fontSize: 'var(--gds-font-size-xs, 11px)',
};

export const recapAnswerStyle: CSS = {
    color: 'var(--gds-color-text-secondary)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
};

/** Las respuestas viejas se resumen para que la tarjeta no crezca sin fin. */
export const recapMoreStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-tertiary)',
    fontStyle: 'italic',
};

/** Cabecera con el progreso: cuántos pasos van y cuántos quedan. */
export const stepHeaderStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-1, 4px)',
    marginBottom: 'var(--gds-spacing-2, 8px)',
};

export const stepCounterStyle: CSS = {
    fontSize: 'var(--gds-font-size-xs, 11px)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
    color: 'var(--gds-color-text-tertiary)',
    letterSpacing: '0.02em',
};

/** Fila del "Atrás": separada de la acción principal para no confundirlas. */
export const backRowStyle: CSS = {
    display: 'flex',
    marginTop: 'var(--gds-spacing-1, 4px)',
};

export const progressStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-tertiary)',
};
