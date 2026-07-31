import { Fragment, h } from 'preact';
import { ChatMessageParams } from '../../types/chat-types';
import {
    systemWrapperStyle,
    systemMessageStyle,
    consentWrapperStyle,
    consentMessageStyle,
    wrapperStyle,
    contentColumnStyle,
    messageStyle,
    messageTextStyle,
    timeSpacerStyle,
    timeStyle,
    authorNameStyle,
    avatarStyle,
    microstateStyle,
    retryStyle,
} from './MessageBubble.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthorType = 'own' | 'human' | 'ai' | 'system' | 'consent';
type Microstate = 'sending' | 'sent' | 'read' | 'error';

export interface MessageBubbleProps {
    message: ChatMessageParams;
    /** Explicit author type — derived from message.sender/isAI if omitted */
    authorType?: AuthorType;
    /** Display name for screen-reader aria-label */
    authorName?: string;
    /** Single initial letter for human mini-avatar */
    authorInitial?: string;
    /** Whether this message is the last in a consecutive group (same author) */
    isLastInGroup?: boolean;
    /** Delivery microstate for own messages */
    microstate?: Microstate;
    /** Called when user taps "Reintentar" on an error microstate */
    onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Patch #20: preserve `\n` for `white-space: pre-wrap` rendering.
 */
function cleanContent(content: string | null | undefined): string {
    if (content == null) return '';
    return content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function formatTime(timestamp?: number): string {
    if (timestamp == null) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function resolveAuthorType(sender: string, _isAI?: boolean): AuthorType {
    if (sender === 'user')    return 'own';
    if (sender === 'system')  return 'system';
    if (sender === 'consent') return 'consent';
    // No distinguimos IA en UI: se muestra como agente.
    return 'human';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Mini-avatar 20×20px shown inline for human and ai message types.
 * Hidden from AT with aria-hidden.
 */
function AuthorAvatar({ initial }: { type?: 'human' | 'ai'; initial?: string }) {
    return (
        <div style={avatarStyle('human')} aria-hidden="true">
            <span>{initial ?? '?'}</span>
        </div>
    );
}

/**
 * Delivery state indicator shown next to the timestamp for own messages.
 */
function MicrostateIcon({ state, onRetry }: { state?: Microstate; onRetry?: () => void }) {
    if (state === 'sending') {
        return <span style={microstateStyle} aria-label="Enviando">🕐</span>;
    }
    if (state === 'sent') {
        return <span style={{ ...microstateStyle, color: 'var(--gds-color-success)' }} aria-label="Enviado">✓</span>;
    }
    if (state === 'read') {
        return <span style={{ ...microstateStyle, color: 'var(--gds-color-success)' }} aria-label="Leído">✓✓</span>;
    }
    if (state === 'error') {
        return (
            <span>
                <span style={{ ...microstateStyle, color: 'var(--gds-color-error)' }} aria-label="Error de envío">✗</span>
                {onRetry && (
                    <button onClick={onRetry} style={retryStyle}>Reintentar</button>
                )}
            </span>
        );
    }
    return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MessageBubble({
    message,
    authorType,
    authorName,
    authorInitial,
    isLastInGroup = true,
    microstate,
    onRetry,
}: MessageBubbleProps) {
    const sender = message.sender;
    const resolved: AuthorType = authorType ?? resolveAuthorType(sender, message.isAI);
    const cleaned = cleanContent(message.text);
    // Sanitize for aria-label: strip quotes to prevent AT injection
    const cleanedForAria = cleaned.replace(/"/g, '\u201c').replace(/'/g, '\u2018');

    // ── system ────────────────────────────────────────────────────────────────
    if (resolved === 'system') {
        return (
            <div class="chat-message-wrapper" style={systemWrapperStyle}>
                <div class="chat-message" style={systemMessageStyle}>
                    {cleaned}
                </div>
            </div>
        );
    }

    // ── consent ───────────────────────────────────────────────────────────────
    if (resolved === 'consent') {
        return (
            <div class="chat-message-wrapper chat-message-consent-wrapper" style={consentWrapperStyle}>
                <div
                    class="chat-message chat-message-consent"
                    role="note"
                    style={consentMessageStyle}
                >
                    {cleaned}
                </div>
            </div>
        );
    }

    // ── regular ───────────────────────────────────────────────────────────────
    const isOwn = resolved === 'own';
    const showAvatar = resolved === 'human' && isLastInGroup;
    const timeText = formatTime(message.timestamp);
    const displayName = authorName ?? (isOwn ? 'Tú' : 'Agente');

    const wrapperClass = isOwn
        ? 'chat-message-wrapper chat-message-user-wrapper'
        : 'chat-message-wrapper chat-message-other-wrapper';

    const messageClass = isOwn
        ? 'chat-message chat-message-user'
        : 'chat-message chat-message-other';

    return (
        <div
            class={wrapperClass}
            style={wrapperStyle(isOwn, isLastInGroup)}
            aria-label={timeText ? `${displayName} dijo: ${cleanedForAria} a las ${timeText}` : `${displayName} dijo: ${cleanedForAria}`}
        >
            {/* Mini-avatar placeholder (keeps bubble aligned when no avatar) */}
            {!isOwn && (
                showAvatar
                    ? <AuthorAvatar initial={authorInitial} />
                    : <div style={{ width: '20px', flexShrink: 0 }} />
            )}

            <div style={contentColumnStyle(isOwn)}>
                {!isOwn && isLastInGroup && resolved === 'human' && (
                    <span style={authorNameStyle('human')}>{displayName}</span>
                )}
                <div class={messageClass} style={messageStyle(resolved, isLastInGroup)}>
                    <span style={messageTextStyle}>{cleaned}</span>
                    {timeText && (
                        <Fragment>
                            {/* Invisible spacer preserves bubble width for timestamp (WhatsApp style) */}
                            <span style={timeSpacerStyle}>
                                {` ${timeText}`}
                                {microstate && ' ·'}
                            </span>
                            <span class="chat-message-time" style={timeStyle(isOwn)}>
                                {timeText}
                                <MicrostateIcon state={microstate} onRetry={onRetry} />
                            </span>
                        </Fragment>
                    )}
                </div>
            </div>
        </div>
    );
}
