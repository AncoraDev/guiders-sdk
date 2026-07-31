import { useRef, useState, useEffect } from 'preact/hooks';
import { presenceServiceSignal } from '../../signals/presenceState';
import {
    chatIdSignal,
    chatInputPlaceholderSignal,
    presenceStatusSignal,
} from '../../signals/chatState';
import { sendMessageCallbackSignal } from '../../signals/messagesState';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { TypingIndicator } from '../TypingIndicator';

const MAX_TEXTAREA_HEIGHT_PX = 100;

const PLACEHOLDER_NO_AGENTS = 'Déjanos tu mensaje…';

// ---------------------------------------------------------------------------
// ChatInput
// ---------------------------------------------------------------------------

/**
 * ChatInput — Composer with:
 *   - Auto-grow textarea (max 100px ≈ 5 lines)
 *   - Visual Viewport API for mobile keyboard avoidance
 *   - Send button microstate (opacity + aria-disabled when empty)
 *   - Enter-to-send (Shift+Enter inserts newline)
 *   - IME composition guard (Patch #19)
 */
export function ChatInput() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const composerRef = useRef<HTMLDivElement>(null);
    const presenceService = presenceServiceSignal.value;
    const chatId = chatIdSignal.value;
    const defaultPlaceholder = chatInputPlaceholderSignal.value;
    const noAgents = presenceStatusSignal.value === 'offline';
    const placeholder = noAgents ? PLACEHOLDER_NO_AGENTS : defaultPlaceholder;

    const [hasContent, setHasContent] = useState(false);

    const { handleTyping } = useTypingIndicator(presenceService, chatId);
    const onSend = sendMessageCallbackSignal.value;

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const composerEl = composerRef.current;
        if (!composerEl) return;

        const handler = () => {
            const offset = window.innerHeight - vv.height;
            composerEl.style.transform = offset > 0 ? `translateY(-${offset}px)` : '';
        };

        vv.addEventListener('resize', handler);
        vv.addEventListener('scroll', handler);
        return () => {
            vv.removeEventListener('resize', handler);
            vv.removeEventListener('scroll', handler);
        };
    }, []);

    const handleInput = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX) + 'px';
        setHasContent(el.value.trim().length > 0);
        handleTyping();
    };

    const handleSend = () => {
        const el = textareaRef.current;
        if (!el) return;
        const message = el.value.trim();
        if (!message) return;

        if (onSend) onSend(message);

        el.value = '';
        el.style.height = 'auto';
        setHasContent(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.isComposing || (e as KeyboardEvent & { keyCode: number }).keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <TypingIndicator authorType="human" />
            <div
                class={`chat-input-container${hasContent ? ' chat-input-container--ready' : ''}`}
                ref={composerRef}
            >
                <div class="chat-input-inner">
                    <div class="chat-input-wrapper">
                        <textarea
                            ref={textareaRef}
                            class="chat-input-field"
                            placeholder={placeholder}
                            rows={1}
                            onInput={handleInput}
                            onKeyDown={handleKeyDown}
                            aria-label="Mensaje"
                        />
                        <button
                            class={`chat-send-btn${hasContent ? ' chat-send-btn--active' : ''}`}
                            type="button"
                            aria-label="Enviar mensaje"
                            aria-disabled={hasContent ? undefined : 'true'}
                            onClick={hasContent ? handleSend : undefined}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                                width="18"
                                height="18"
                            >
                                <path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M3.29106 3.3088C3.00745 3.18938 2.67967 3.25533 2.4643 3.47514C2.24894 3.69495 2.1897 4.02401 2.31488 4.30512L5.40752 11.25H13C13.4142 11.25 13.75 11.5858 13.75 12C13.75 12.4142 13.4142 12.75 13 12.75H5.40754L2.31488 19.6949C2.1897 19.976 2.24894 20.3051 2.4643 20.5249C2.67967 20.7447 3.00745 20.8107 3.29106 20.6912L22.2911 12.6913C22.5692 12.5742 22.75 12.3018 22.75 12C22.75 11.6983 22.5692 11.4259 22.2911 11.3088L3.29106 3.3088Z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
