// ContactRequestCard.styles.ts — incoming chat card, --gds-* tokens only.
import type { h } from 'preact';

type CSS = h.JSX.CSSProperties;

export const cardStyle: CSS = {
    alignSelf: 'flex-start',
    width: '92%',
    maxWidth: '92%',
    margin: '0 8% var(--gds-spacing-3, 12px) 0',
    padding: 'var(--gds-spacing-4, 16px)',
    boxSizing: 'border-box',
    background: 'var(--gds-color-bg-elevated)',
    border: '1px solid var(--gds-color-border)',
    borderRadius: 'var(--gds-radius-bubble, 14px)',
    fontFamily: 'inherit',
    color: 'var(--gds-color-text)',
};

export const titleStyle: CSS = {
    margin: '0 0 var(--gds-spacing-1, 4px)',
    fontSize: 'var(--gds-font-size-sm, 13px)',
    fontWeight: 'var(--gds-font-weight-semibold, 600)' as unknown as number,
    color: 'var(--gds-color-text)',
    lineHeight: 'var(--gds-line-height-tight, 1.3)',
};

export const subtitleStyle: CSS = {
    margin: '0 0 var(--gds-spacing-4, 16px)',
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-secondary)',
    lineHeight: 'var(--gds-line-height-normal, 1.5)',
};

export const fieldStyle: CSS = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-1, 4px)',
    marginBottom: 'var(--gds-spacing-3, 12px)',
};

export const requiredLabelStyle: CSS = {
    fontSize: 'var(--gds-font-size-xs, 11px)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
    color: 'var(--gds-color-text-secondary)',
};

export const optionalLabelStyle: CSS = {
    fontSize: 'var(--gds-font-size-xs, 11px)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
    color: 'var(--gds-color-text-tertiary)',
};

const inputBase: CSS = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--gds-spacing-2, 8px) var(--gds-spacing-3, 12px)',
    borderRadius: 'var(--gds-radius-md, 8px)',
    fontSize: 'var(--gds-font-size-sm, 13px)',
    fontFamily: 'inherit',
    color: 'var(--gds-color-text)',
    background: 'var(--gds-color-bg)',
    outline: 'none',
};

export const inputStyle: CSS = {
    ...inputBase,
    border: '1px solid var(--gds-color-border)',
};

export const inputFocusStyle: CSS = {
    ...inputBase,
    border: '1px solid var(--gds-color-primary)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--gds-color-primary) 18%, transparent)',
};

export const inputErrorStyle: CSS = {
    ...inputBase,
    border: '1px solid var(--gds-color-error)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--gds-color-error) 16%, transparent)',
};

export const fieldErrorStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-error)',
    lineHeight: 'var(--gds-line-height-tight, 1.3)',
};

export const formErrorStyle: CSS = {
    margin: '0 0 var(--gds-spacing-3, 12px)',
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-error)',
};

export const buttonStyle: CSS = {
    width: '100%',
    marginTop: 'var(--gds-spacing-1, 4px)',
    padding: 'var(--gds-spacing-3, 12px) var(--gds-spacing-4, 16px)',
    border: 'none',
    borderRadius: 'var(--gds-radius-md, 8px)',
    background: 'var(--gds-color-primary)',
    color: 'var(--gds-color-text-on-primary)',
    fontSize: 'var(--gds-font-size-sm, 13px)',
    fontWeight: 'var(--gds-font-weight-semibold, 600)' as unknown as number,
    fontFamily: 'inherit',
    cursor: 'pointer',
};

export const buttonDisabledStyle: CSS = {
    ...buttonStyle,
    opacity: 0.55,
    cursor: 'default',
};

export const doneCardStyle: CSS = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--gds-spacing-1, 4px)',
};

export const doneCheckStyle: CSS = {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--gds-spacing-1, 4px)',
    background: 'color-mix(in srgb, var(--gds-color-success) 16%, var(--gds-color-bg-elevated))',
    color: 'var(--gds-color-success)',
    fontSize: 'var(--gds-font-size-xs, 11px)',
    fontWeight: 'var(--gds-font-weight-semibold, 600)' as unknown as number,
};

export const doneHintStyle: CSS = {
    margin: 0,
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-secondary)',
    lineHeight: 'var(--gds-line-height-normal, 1.5)',
};

export const doneNameStyle: CSS = {
    margin: 'var(--gds-spacing-2, 8px) 0 0',
    fontSize: 'var(--gds-font-size-sm, 13px)',
    color: 'var(--gds-color-text)',
    fontWeight: 'var(--gds-font-weight-medium, 500)' as unknown as number,
};

export function resolveInputStyle(opts: {
    focused: boolean;
    invalid: boolean;
}): CSS {
    if (opts.invalid) return inputErrorStyle;
    if (opts.focused) return inputFocusStyle;
    return inputStyle;
}
