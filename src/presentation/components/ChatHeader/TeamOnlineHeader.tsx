import { onlineCommercialCountSignal } from '../../signals/chatState';
import { PresenceIndicator } from '../PresenceIndicator';

const TEAM_TITLE = 'Equipo conectado';
const TEAM_SUBTITLE_DEFAULT = 'Te atendemos en cuanto escribas.';

function personSilhouette() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 18.5c1.2-3.1 3.4-4.6 6.5-4.6s5.3 1.5 6.5 4.6" />
        </svg>
    );
}

/**
 * Cabecera cuando hay comerciales online pero ninguno asignado a este chat.
 * Stack genérico: no son caras reales (el API solo da un recuento).
 */
export function TeamOnlineHeader() {
    const count = onlineCommercialCountSignal.value;
    const stackSize = count >= 3 ? 3 : 2;
    const subtitle = count > 1
        ? `Hay ${count} personas disponibles.`
        : TEAM_SUBTITLE_DEFAULT;

    return (
        <div class="chat-header-identity chat-header-identity--team">
            <div class="chat-header-avatar-container chat-header-avatar-stack">
                {Array.from({ length: stackSize }, (_, index) => (
                    <div
                        class={`chat-header-avatar chat-header-avatar--stack chat-header-avatar--stack-${index}`}
                        key={index}
                    >
                        {personSilhouette()}
                    </div>
                ))}
                <PresenceIndicator />
            </div>
            <div class="chat-header-title-container">
                <span class="chat-header-title">{TEAM_TITLE}</span>
                <span class="chat-header-subtitle" role="status">{subtitle}</span>
            </div>
        </div>
    );
}
