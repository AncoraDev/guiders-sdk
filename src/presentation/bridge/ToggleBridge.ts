import {
    toggleButtonVisibleSignal,
    toggleChatOpenSignal,
    unreadCountSignal,
    activeChatForUnreadSignal,
    unreadServiceConfigSignal,
} from '../signals/toggleState';
import type { UnreadServiceConfig } from '../types/toggle-types';
import { UnreadMessagesService } from '../../services/unread-messages-service';
import { debugWarn, debugError } from '../../utils/debug-logger';

/**
 * ToggleBridge — manages the floating toggle button state via signals.
 * Extracted from ChatUIBridge to keep toggle concerns isolated.
 */
export class ToggleBridge {
    private _toggleCallbacks: Array<(visible: boolean) => void> = [];
    private _cachedHost: HTMLElement | null = null;
    private suppressed = false;

    // -------------------------------------------------------------------------
    // Visibility
    // -------------------------------------------------------------------------

    initToggleButton(): void {
        if (this.suppressed) return;
        toggleButtonVisibleSignal.value = true;
    }

    showToggleButton(): void {
        if (this.suppressed) return;
        toggleButtonVisibleSignal.value = true;
    }

    /** Oculta el botón y no deja que un horario o la captación lo vuelvan a mostrar. */
    suppress(): void {
        this.suppressed = true;
        this.hideToggleButton();
    }

    hideToggleButton(): void {
        toggleButtonVisibleSignal.value = false;
    }

    isButtonVisible(): boolean {
        return toggleButtonVisibleSignal.peek();
    }

    // -------------------------------------------------------------------------
    // Open / close state
    // -------------------------------------------------------------------------

    /** Reflects the open/close state in the button icon */
    updateToggleState(isOpen: boolean): void {
        toggleChatOpenSignal.value = isOpen;
    }

    notifyChatOpenState(isOpen: boolean): void {
        toggleChatOpenSignal.value = isOpen;
        UnreadMessagesService.getInstance().setChatOpenState(isOpen);
        if (isOpen) unreadCountSignal.value = 0;
    }

    // -------------------------------------------------------------------------
    // Unread badge
    // -------------------------------------------------------------------------

    /**
     * Updates the unread badge count.
     * Patch #25: clamp NaN, negative, and Infinity to 0 to avoid rendering "NaN" or negative badges.
     */
    updateUnreadCount(count: number | null | undefined): void {
        if (count === null || count === undefined) {
            unreadCountSignal.value = 0;
            return;
        }
        if (!Number.isFinite(count) || count < 0) {
            debugWarn('[ToggleBridge] updateUnreadCount received invalid value, clamping to 0:', count);
            unreadCountSignal.value = 0;
            return;
        }
        unreadCountSignal.value = Math.floor(count);
    }

    hideUnreadBadge(): void {
        unreadCountSignal.value = 0;
    }

    // -------------------------------------------------------------------------
    // Click callbacks
    // -------------------------------------------------------------------------

    /** Subscribe to toggle button clicks */
    onToggle(callback: (visible: boolean) => void): void {
        this._toggleCallbacks.push(callback);
    }

    /** @internal — called by ChatUIBridge effect when toggleClickedSignal changes */
    fireToggleCallbacks(visible: boolean): void {
        this._toggleCallbacks.forEach(cb => {
            try {
                cb(visible);
            } catch (error) {
                debugError('[ToggleBridge] Toggle callback threw:', error);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Unread messages service
    // -------------------------------------------------------------------------

    /**
     * Patch #24: reject empty / whitespace-only visitorId — the unread service
     * requires a real visitor identifier to subscribe to backend events.
     */
    connectUnreadService(
        visitorId: string,
        onMessageReceived?: (chatId: string) => void,
        autoOpenChatOnMessage?: boolean
    ): void {
        if (typeof visitorId !== 'string' || visitorId.trim().length === 0) {
            debugWarn('[ToggleBridge] connectUnreadService called with empty visitorId — ignored');
            return;
        }
        const cfg: UnreadServiceConfig = { visitorId, onMessageReceived, autoOpenChatOnMessage };
        unreadServiceConfigSignal.value = cfg;
    }

    setActiveChatForUnread(chatId: string): void {
        activeChatForUnreadSignal.value = chatId;
    }

    /**
     * Patch #32: wrap the service call so a network failure doesn't reject the
     * promise chain in the SDK. Errors are logged but never thrown.
     */
    async markAllMessagesAsRead(): Promise<void> {
        try {
            await UnreadMessagesService.getInstance().markAllAsRead();
        } catch (error) {
            debugError('[ToggleBridge] markAllMessagesAsRead failed:', error);
        }
    }

    // -------------------------------------------------------------------------
    // DOM helpers
    // -------------------------------------------------------------------------

    /**
     * Patch #21: cache the shadow host lookup. Querying `document.querySelector`
     * on every call is wasteful — the host is mounted once and never replaced.
     */
    getButtonElement(): HTMLElement | null {
        if (!this._cachedHost || !document.contains(this._cachedHost)) {
            this._cachedHost = document.querySelector('#guiders-chat-widget') as HTMLElement | null;
        }
        return this._cachedHost?.shadowRoot?.querySelector('.chat-toggle-btn') as HTMLElement | null ?? null;
    }
}
