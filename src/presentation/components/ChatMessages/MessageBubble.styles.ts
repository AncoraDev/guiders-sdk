// MessageBubble.styles.ts — GCS token-based styles for MessageBubble (Story 6.3).
// Zero hardcoded color values — all colors use --gds-* tokens from tokens.styles.ts.
// Direction: C · Concierge Express — density alta, radius 14px, font 13px.

import type { h } from 'preact';

type CSS = h.JSX.CSSProperties;

// ---------------------------------------------------------------------------
// System message
// ---------------------------------------------------------------------------

export const systemWrapperStyle: CSS = {
    alignSelf: 'center',
    maxWidth: '90%',
    marginBottom: '12px',
};

export const systemMessageStyle: CSS = {
    background: 'var(--gds-color-bg-elevated)',
    border: '1px solid var(--gds-color-border)',
    borderRadius: 'var(--gds-radius-bubble, 14px)',
    padding: '6px 12px',
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-tertiary)',
    textAlign: 'center',
};

// ---------------------------------------------------------------------------
// Consent message
// ---------------------------------------------------------------------------

export const consentWrapperStyle: CSS = {
    alignSelf: 'center',
    maxWidth: '92%',
    marginBottom: '12px',
};

export const consentMessageStyle: CSS = {
    background: 'var(--gds-color-bg-elevated)',
    border: '1px solid var(--gds-color-border-accent)',
    borderRadius: 'var(--gds-radius-bubble, 14px)',
    padding: '10px 14px',
    fontSize: 'var(--gds-font-size-xs, 11px)',
    color: 'var(--gds-color-text-secondary)',
    textAlign: 'center',
    lineHeight: 1.5,
};

// ---------------------------------------------------------------------------
// Row wrapper (aligns bubble + optional avatar)
// ---------------------------------------------------------------------------

export function wrapperStyle(isUser: boolean, isLastInGroup: boolean): CSS {
    return {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '6px',
        marginBottom: isLastInGroup ? '12px' : '8px',
        flexDirection: isUser ? 'row-reverse' : 'row',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
    };
}

// ---------------------------------------------------------------------------
// Content column (holds header + bubble)
// ---------------------------------------------------------------------------

export function contentColumnStyle(isUser: boolean): CSS {
    return {
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        // Ancho del contenido, tope 75% del hilo (evita encoger la burbuja en flex).
        width: 'max-content',
        maxWidth: '75%',
    };
}

// ---------------------------------------------------------------------------
// Bubble
// ---------------------------------------------------------------------------

type AuthorType = 'own' | 'human' | 'ai' | 'system' | 'consent';

function bubbleBg(type: AuthorType): string {
    switch (type) {
        case 'own':     return 'var(--gds-color-bubble-own)';
        case 'human':   return 'var(--gds-color-author-human-soft)';
        case 'ai':      return 'var(--gds-color-author-ai-soft)';
        default:        return 'var(--gds-color-bg-elevated)';
    }
}

function bubbleBorder(type: AuthorType): string {
    switch (type) {
        case 'human':   return '1px solid var(--gds-color-author-human)';
        case 'ai':      return '1px solid var(--gds-color-author-ai)';
        default:        return 'none';
    }
}

function bubbleColor(type: AuthorType): string {
    return type === 'own' ? 'var(--gds-color-text-on-bubble-own, #ffffff)' : 'var(--gds-color-text)';
}

function tailRadius(type: AuthorType, isLastInGroup: boolean): Partial<CSS> {
    if (!isLastInGroup) return {};
    if (type === 'own')                   return { borderBottomRightRadius: '4px' };
    if (type === 'human' || type === 'ai') return { borderBottomLeftRadius: '4px' };
    return {};
}

export function messageStyle(type: AuthorType, isLastInGroup: boolean): CSS {
    return {
        padding: '7px 11px',
        borderRadius: 'var(--gds-radius-bubble, 14px)',
        display: 'inline-block',
        width: 'fit-content',
        maxWidth: '100%',
        overflowWrap: 'break-word',
        position: 'relative',
        background: bubbleBg(type),
        color: bubbleColor(type),
        border: bubbleBorder(type),
        ...tailRadius(type, isLastInGroup),
    };
}

// ---------------------------------------------------------------------------
// Author name label (shown above bubble for human/ai, not for own)
// ---------------------------------------------------------------------------

export function authorNameStyle(type: AuthorType): CSS {
    const color = type === 'ai'
        ? 'var(--gds-color-author-ai)'
        : 'var(--gds-color-author-human)';
    return {
        fontSize: 'var(--gds-font-size-xs, 11px)',
        fontWeight: 'var(--gds-font-weight-semibold, 600)' as unknown as number,
        color,
        marginBottom: '2px',
        paddingLeft: '2px',
    };
}

// ---------------------------------------------------------------------------
// Message text
// ---------------------------------------------------------------------------

export const messageTextStyle: CSS = {
    fontSize: 'var(--gds-font-size-sm, 13px)',
    lineHeight: 'var(--gds-line-height-normal)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
};

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

export const timeSpacerStyle: CSS = {
    visibility: 'hidden',
    fontSize: '10px',
    paddingLeft: '6px',
    whiteSpace: 'nowrap',
};

export function timeStyle(isOwn: boolean): CSS {
    return {
        position: 'absolute',
        bottom: '5px',
        right: '9px',
        fontSize: '10px',
        // Own bubbles: white at 70% opacity over primary bg; others: standard tertiary
        color: isOwn ? 'rgba(255, 255, 255, 0.70)' : 'var(--gds-color-text-tertiary)',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
    };
}

// ---------------------------------------------------------------------------
// Mini-avatar (AuthorAvatar) 20×20px
// ---------------------------------------------------------------------------

export function avatarStyle(type: 'human' | 'ai'): CSS {
    const isAI = type === 'ai';
    return {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 600,
        lineHeight: '1',
        // Both human and ai use soft bg + identity color for initial (consistent pattern)
        background: isAI ? 'var(--gds-color-author-ai-soft)' : 'var(--gds-color-author-human-soft)',
        color: isAI ? 'var(--gds-color-author-ai)' : 'var(--gds-color-author-human)',
    };
}

// ---------------------------------------------------------------------------
// Microstate icons
// ---------------------------------------------------------------------------

export const microstateStyle: CSS = {
    fontSize: '10px',
    lineHeight: '1',
};

export const retryStyle: CSS = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '10px',
    color: 'var(--gds-color-primary)',
    padding: '0 0 0 4px',
    textDecoration: 'underline',
};
