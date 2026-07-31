import { assignedPresenceStatusSignal, presenceStatusSignal } from '../../signals/chatState';
import { PresenceIndicator, PRESENCE_LABEL } from '../PresenceIndicator';
import type { PresenceUiStatus } from '../../types/presence-types';

// ---------------------------------------------------------------------------
// CommercialAvatar
// ---------------------------------------------------------------------------

interface CommercialAvatarProps {
    name: string;
    avatarUrl?: string;
    initials: string;
}

export function CommercialAvatar({ name, avatarUrl, initials }: CommercialAvatarProps) {
    const status: PresenceUiStatus =
        assignedPresenceStatusSignal.value ?? presenceStatusSignal.value;
    const statusLabel = PRESENCE_LABEL[status];

    return (
        <div class="chat-header-main">
            <div class="chat-header-avatar-container">
                <div class="chat-header-avatar">
                    {avatarUrl
                        // Patch #45: avatar is decorative — the commercial's
                        // name is already in chat-header-title right next to
                        // it. Empty alt prevents double-announcement by AT.
                        ? <img src={avatarUrl} alt="" role="presentation" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />
                        : <span style="font-weight:600;font-size:16px;" aria-hidden="true">{initials}</span>
                    }
                </div>
                {/* Presence dot — positioned absolute via CSS */}
                <PresenceIndicator />
            </div>
            <div class="chat-header-title-container">
                <span class="chat-header-title">{name}</span>
                <span class={`chat-header-presence-text chat-header-presence-text--${status}`} aria-live="polite">
                    {statusLabel}
                </span>
            </div>
        </div>
    );
}
