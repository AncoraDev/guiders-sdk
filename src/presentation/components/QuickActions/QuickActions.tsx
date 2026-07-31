import { useState, useEffect, useRef } from 'preact/hooks';
import {
    QuickActionsConfig,
    QuickActionButton,
    QuickActionPayload,
} from '../../../presentation/types/chat-types';
import {
    quickActionSendMessageSignal,
    quickActionRequestAgentSignal,
    trackQuickActionSignal,
} from '../../signals/actionState';
import { chatIdSignal, hasAssignedCommercialSignal } from '../../signals/chatState';
import { messagesSignal } from '../../signals/messagesState';
import { debugLog } from '../../../utils/debug-logger';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuickActionsProps {
    config: QuickActionsConfig;
}

// ---------------------------------------------------------------------------
// Helpers — resolve payload to concrete values
// ---------------------------------------------------------------------------

function resolveSendMessage(button: QuickActionButton): { message: string; metadata?: Record<string, unknown> } | null {
    const { payload } = button.action;
    if (typeof payload === 'string') return { message: payload };
    if (payload && typeof payload === 'object') {
        // Patch #36: payload is already typed as QuickActionPayload via the union,
        // and metadata is now Record<string, unknown> upstream — no cast needed.
        const p = payload as QuickActionPayload;
        return { message: p.message ?? '', metadata: p.metadata };
    }
    debugLog('[QuickActions] send_message sin payload, ignorando');
    return null;
}

function resolveOpenUrl(button: QuickActionButton): string | null {
    const { payload } = button.action;
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object') {
        return (payload as QuickActionPayload).message ?? null;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * QuickActions — Story 6.5:
 *   - Persistent "🙋 Hablar con persona" CTA when AI is active (AC: 7)
 *   - CTA hidden when human agent is assigned (AC: 8)
 *   - CTA fade-out on click, then dispatch quickActionRequestAgentSignal (AC: 9)
 *   - Reset CTA state when chatId changes (Patch #18)
 */
export function QuickActions({ config }: QuickActionsProps) {
    const [hidden, setHidden] = useState(false);
    // Human-CTA specific state (only this chip fades, not the whole panel)
    const [humanCtaFading, setHumanCtaFading] = useState(false);
    const [humanCtaHidden, setHumanCtaHidden] = useState(false);
    // Guard setState calls after unmount (e.g. widget closes mid-fade)
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    // Patch #18: re-show quick actions when the visitor switches to a different chat.
    const chatId = chatIdSignal.value;
    useEffect(() => {
        setHidden(false);
        setHumanCtaFading(false);
        setHumanCtaHidden(false);
    }, [chatId]);

    // AC 8: reset human CTA if agent unassigns (edge case)
    const isHumanAssigned = hasAssignedCommercialSignal.value;
    useEffect(() => {
        if (!isHumanAssigned) {
            setHumanCtaFading(false);
            setHumanCtaHidden(false);
        }
    }, [isHumanAssigned]);

    if (hidden || !config.enabled) return null;

    const hasButtons = config.buttons.length > 0;
    if (!config.welcomeMessage && !hasButtons) return null;

    // Hide quick actions (welcome message + buttons) when there are already real
    // messages in the conversation. System and consent messages don't count.
    const hasRealMessages = messagesSignal.value.some(
        (m) => m.sender !== 'system' && m.sender !== 'consent'
    );
    if (hasRealMessages) return null;

    // AC 7: show persistent human CTA when AI is active, not yet clicked,
    // and no explicit request_agent button already exists in the config list.
    // Only when there are configured quick-action buttons.
    const hasRequestAgentButton = config.buttons.some(b => b.action.type === 'request_agent');
    const showHumanCTA = hasButtons && !isHumanAssigned && !humanCtaHidden && !hasRequestAgentButton;

    const handleClick = (button: QuickActionButton) => {
        // Track first, before hiding
        trackQuickActionSignal.value = { buttonId: button.id, actionType: button.action.type };

        switch (button.action.type) {
            case 'send_message': {
                const resolved = resolveSendMessage(button);
                if (resolved) {
                    quickActionSendMessageSignal.value = resolved;
                }
                setHidden(true);
                break;
            }
            case 'open_url': {
                // Patch #32: open_url BEFORE hiding so Safari's popup blocker
                // recognises this as a direct user-gesture-driven window.open().
                const url = resolveOpenUrl(button);
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                setHidden(true);
                break;
            }
            case 'request_agent': {
                quickActionRequestAgentSignal.value = quickActionRequestAgentSignal.peek() + 1;
                setHidden(true);
                break;
            }
            case 'custom': {
                config.onCustomAction?.(button.id, button.action);
                setHidden(true);
                break;
            }
        }
    };

    // AC 9: human CTA click — fade-out then hide, dispatch signal
    const handleHumanCtaClick = () => {
        setHumanCtaFading(true);
        quickActionRequestAgentSignal.value = quickActionRequestAgentSignal.peek() + 1;
        setTimeout(() => { if (mountedRef.current) setHumanCtaHidden(true); }, 150);
    };

    return (
        <div class="guiders-quick-actions">
            {config.welcomeMessage && (
                <p class="guiders-quick-actions-welcome">{config.welcomeMessage}</p>
            )}
            {hasButtons && (
                <div class="guiders-quick-actions-buttons">
                    {/* AC 7: Persistent human CTA — always first */}
                    {showHumanCTA && (
                        <button
                            class="guiders-quick-action-btn guiders-quick-action-btn--human-cta"
                            type="button"
                            style={{
                                opacity: humanCtaFading ? 0 : 1,
                                transition: 'opacity 150ms ease',
                                outline: '1px solid var(--gds-color-author-ai)',
                            }}
                            onClick={handleHumanCtaClick}
                        >
                            🙋 Hablar con persona
                        </button>
                    )}
                    {config.buttons.map((button) => (
                        <button
                            key={button.id}
                            class={`guiders-quick-action-btn${button.action.type === 'request_agent' ? ' guiders-quick-action-btn--agent' : ''}`}
                            type="button"
                            onClick={() => handleClick(button)}
                        >
                            {button.emoji && <span>{button.emoji} </span>}
                            {button.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
