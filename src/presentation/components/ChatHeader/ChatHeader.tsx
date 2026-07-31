import { useState, useEffect } from 'preact/hooks';
import { ChatUIOptions } from '../../types/chat-types';
import {
    chatDetailSignal,
    chatSelectorEnabledSignal,
    hasAssignedCommercialSignal,
    isShowingChatListSignal,
    assignedPresenceStatusSignal,
    presenceStatusSignal,
} from '../../signals/chatState';
import { toggleClickedSignal, toggleChatOpenSignal } from '../../signals/toggleState';
import { generateInitials } from '../../utils/chat-utils';
import { CommercialAvatar } from './CommercialAvatar';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatHeaderProps {
    options: ChatUIOptions;
}

const NO_AGENTS_SUBTITLE =
    'No hay agentes disponibles ahora mismo. Puedes enviarnos un mensaje y avisamos al equipo de soporte.';

// ---------------------------------------------------------------------------
// ChatHeader
// ---------------------------------------------------------------------------

/**
 * Header del chat:
 * - Avatar del comercial solo si el asignado está online/away/busy.
 * - Sin agentes online → icono estándar + aviso en subtítulo.
 */
export function ChatHeader({ options }: ChatHeaderProps) {
    const hasCommercial = hasAssignedCommercialSignal.value;
    const chatDetail = chatDetailSignal.value;
    const commercial = chatDetail?.assignedCommercial;
    const assignedPresence = assignedPresenceStatusSignal.value;
    const supportOnline = presenceStatusSignal.value !== 'offline';
    const showBackBtn = chatSelectorEnabledSignal.value || !!(options.chatSelector?.enabled);
    const title = options.title ?? 'Chat';

    const showHumanAvatar =
        hasCommercial &&
        !!commercial &&
        assignedPresence != null &&
        assignedPresence !== 'offline';

    const showNoAgentsMessage = !showHumanAvatar && !supportOnline;

    const [displayState, setDisplayState] = useState<{
        showHuman: boolean;
        opacity: number;
    }>({
        showHuman: showHumanAvatar,
        opacity: 1,
    });

    useEffect(() => {
        if (showHumanAvatar === displayState.showHuman) return undefined;
        setDisplayState(prev => ({ ...prev, opacity: 0 }));
        const t = setTimeout(() => {
            setDisplayState({ showHuman: showHumanAvatar, opacity: 1 });
        }, 150);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showHumanAvatar]);

    const handleClose = () => {
        if (toggleChatOpenSignal.peek()) {
            toggleClickedSignal.value = toggleClickedSignal.peek() + 1;
        }
    };

    const humanCommercial =
        displayState.showHuman ? commercial : undefined;

    return (
        <div
            class={`chat-header${showNoAgentsMessage ? ' chat-header--no-agents' : ''}`}
            role="banner"
            aria-label={showHumanAvatar
                ? `Chat con ${commercial?.name ?? 'Agente'}`
                : showNoAgentsMessage
                    ? 'Chat — sin agentes disponibles'
                    : 'Chat'}
        >
            {showBackBtn && (
                <button
                    class="chat-back-btn"
                    aria-label="Volver"
                    onClick={() => { isShowingChatListSignal.value = true; }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            )}

            <div
                class="chat-header-main"
                style={{
                    opacity: displayState.opacity,
                    transition: 'opacity 150ms ease',
                    flex: 1,
                    minWidth: 0,
                }}
            >
                {humanCommercial
                    ? (
                        <CommercialAvatar
                            name={humanCommercial.name}
                            avatarUrl={humanCommercial.avatarUrl}
                            initials={generateInitials(humanCommercial.name)}
                        />
                    )
                    : (
                        <div class="chat-header-identity">
                            <div class="chat-header-avatar-container">
                                <div class="chat-header-avatar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div class="chat-header-title-container">
                                <span class="chat-header-title">{title}</span>
                                {showNoAgentsMessage && (
                                    <span class="chat-header-subtitle" role="status">
                                        {NO_AGENTS_SUBTITLE}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                }
            </div>

            <div class="chat-header-actions">
                <button
                    class="chat-close-btn"
                    aria-label="Cerrar chat"
                    onClick={handleClose}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
