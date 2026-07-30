import { useState, useEffect } from 'preact/hooks';
import { showOfflineBannerSignal, offlineBannerEnabledSignal } from '../../signals';
import { offlineBannerTextSignal, chatIdSignal, presenceStatusSignal } from '../../signals/chatState';
import { presenceServiceSignal } from '../../signals/presenceState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RETRY_TIMEOUT_MS = 30_000;
const FADE_OUT_MS = 200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * OfflineBanner — Story 6.6:
 *   - Neutral colors via tokens (never yellow/red — offline is a technical state)
 *   - After 30s, switches to tap-to-retry mode
 *   - Fade-out 200ms on reconnect
 *   - role="alert" + aria-live="assertive"
 *
 * Patch #13: banner text configurable via offlineBannerTextSignal.
 */
export function OfflineBanner() {
    const enabled = offlineBannerEnabledSignal.value;
    const visible = showOfflineBannerSignal.value;
    const configuredText = offlineBannerTextSignal.value;

    const [mounted, setMounted] = useState(visible && enabled);
    const [opacity, setOpacity] = useState(visible && enabled ? 1 : 0);
    const [retryable, setRetryable] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        if (visible) {
            setMounted(true);
            setRetryable(false);
            // Double-rAF: first rAF lets Preact paint the mounted element at opacity:0,
            // second rAF triggers the CSS transition to opacity:1.
            let innerRaf = 0;
            const outerRaf = requestAnimationFrame(() => {
                innerRaf = requestAnimationFrame(() => setOpacity(1));
            });
            const retryTimer = setTimeout(() => setRetryable(true), RETRY_TIMEOUT_MS);
            return () => {
                cancelAnimationFrame(outerRaf);
                cancelAnimationFrame(innerRaf);
                clearTimeout(retryTimer);
            };
        } else {
            // Fade out, then unmount
            setOpacity(0);
            const t = setTimeout(() => setMounted(false), FADE_OUT_MS);
            return () => clearTimeout(t);
        }
    }, [visible, enabled]);

    if (!mounted || !enabled) return null;

    const handleRetry = () => {
        if (!retryable) return;
        showOfflineBannerSignal.value = false;
        // Reintentar sesión + presencia sin forzar F5 al usuario
        void (async () => {
            try {
                const { ChatV2Service } = await import('../../../services/chat-v2-service');
                const reauthed = await ChatV2Service.getInstance().reAuthenticate();
                if (!reauthed) return;
                const chatId = chatIdSignal.peek();
                const presence = presenceServiceSignal.peek();
                if (!chatId || !presence?.getChatPresence) return;
                const snapshot = await presence.getChatPresence(chatId);
                const commercials =
                    snapshot?.participants?.filter((p) => p.userType === 'commercial') ?? [];
                const anyOnline = commercials.some((p) => p.connectionStatus === 'online');
                if (anyOnline) {
                    presenceStatusSignal.value = 'online';
                    showOfflineBannerSignal.value = false;
                }
            } catch {
                // Silencioso: el banner puede volver a mostrarse vía usePresence
            }
        })();
    };

    const displayText = retryable
        ? 'Sin conexión · toca para reintentar'
        : (configuredText || 'Sin conexión · reintentando…');

    return (
        <div
            class="guiders-offline-banner"
            role="alert"
            onClick={retryable ? handleRetry : undefined}
            style={{
                opacity,
                transition: `opacity ${FADE_OUT_MS}ms ease`,
                cursor: retryable ? 'pointer' : 'default',
            }}
        >
            <span class="guiders-offline-banner__dot" aria-hidden="true" />
            <span>{displayText}</span>
        </div>
    );
}
