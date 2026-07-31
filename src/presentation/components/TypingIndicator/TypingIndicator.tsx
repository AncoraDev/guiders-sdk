import { h } from 'preact';
import { isTypingSignal } from '../../signals/chatState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypingIndicatorProps {
    /** @deprecated Ya no distingue IA; se mantiene por compatibilidad. */
    authorType?: 'human' | 'ai';
    /** Display name shown in "X está escribiendo…" */
    authorName?: string;
}

// ---------------------------------------------------------------------------
// Inline style helpers
// ---------------------------------------------------------------------------

function dotStyle(): h.JSX.CSSProperties {
    return {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--gds-color-author-human)',
        display: 'inline-block',
        animation: 'gdsBounce var(--gds-duration-bounce, 1.2s) infinite ease-in-out',
    };
}

function TypingAvatar({ initial }: { initial?: string }) {
    return (
        <div
            aria-hidden="true"
            style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 600,
                background: 'var(--gds-color-author-human)',
                color: 'var(--gds-color-text-on-primary, #ffffff)',
            }}
        >
            {(initial && initial[0]?.toUpperCase()) || '?'}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TypingIndicator — shows animated 3-dot bubble when the interlocutor is typing.
 * Driven by isTypingSignal (set via ChatUIBridge.setCommercialTyping()).
 */
export function TypingIndicator({ authorName }: TypingIndicatorProps) {
    const isTyping = isTypingSignal.value;
    const displayName = authorName ?? 'Agente';
    const initial = authorName?.[0]?.toUpperCase();

    return (
        <div
            class="guiders-typing-indicator"
            role="status"
            aria-live="polite"
            aria-hidden={isTyping ? undefined : 'true'}
            style={{ opacity: isTyping ? 1 : 0, pointerEvents: 'none' }}
        >
            <TypingAvatar initial={initial} />
            <div class="guiders-typing-bubble" aria-hidden="true">
                <span class="guiders-typing-dot" style={dotStyle()} />
                <span class="guiders-typing-dot" style={{ ...dotStyle(), animationDelay: '0.2s' }} />
                <span class="guiders-typing-dot" style={{ ...dotStyle(), animationDelay: '0.4s' }} />
            </div>
            {isTyping && <span class="guiders-typing-text">{displayName} está escribiendo…</span>}
        </div>
    );
}
