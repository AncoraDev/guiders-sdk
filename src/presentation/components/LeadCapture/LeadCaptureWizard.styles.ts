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

export const optionButtonStyle: CSS = {
    padding: 'var(--gds-spacing-3, 12px) var(--gds-spacing-4, 16px)',
    borderRadius: 'var(--gds-radius-md, 8px)',
    border: '1px solid var(--gds-color-border)',
    background: 'var(--gds-color-bg)',
    color: 'var(--gds-color-text)',
    fontSize: 'var(--gds-font-size-sm, 13px)',
    fontFamily: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
};

export const recapListStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-1, 4px)',
    margin: '0 0 var(--gds-spacing-2, 8px)',
    padding: '0 0 var(--gds-spacing-2, 8px)',
    borderBottom: '1px solid var(--gds-color-border)',
};

export const recapItemStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-secondary)',
    lineHeight: 'var(--gds-line-height-normal, 1.5)',
};

export const recapAnswerStyle: CSS = {
    color: 'var(--gds-color-text)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
};

export const progressStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-tertiary)',
};
