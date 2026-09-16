export const EMPTY_STATE_TITLE = 'Cuéntanos qué necesitas';
export const DEFAULT_EMPTY_STATE_BODY = 'Te lee una persona, no un bot.';

interface ChatEmptyStateProps {
    body?: string;
}

/**
 * Estado vacío del hilo: invita a escribir y deja claro que responde una persona.
 * El header sigue comunicando si hay comerciales online.
 */
export function ChatEmptyState({ body }: ChatEmptyStateProps) {
    const text = (body ?? '').trim() || DEFAULT_EMPTY_STATE_BODY;

    return (
        <div class="guiders-chat-empty" role="status">
            <div class="guiders-chat-empty-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path
                        d="M12 14.5c0-2.5 2-4.5 4.5-4.5h15c2.5 0 4.5 2 4.5 4.5v12c0 2.5-2 4.5-4.5 4.5H22l-6.5 5v-5H16.5c-2.5 0-4.5-2-4.5-4.5v-12z"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linejoin="round"
                    />
                    <circle cx="24" cy="18" r="3.25" fill="currentColor" />
                    <path
                        d="M17.5 27.5c1-3 3.4-4.75 6.5-4.75s5.5 1.75 6.5 4.75"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                    />
                </svg>
            </div>
            <h2 class="guiders-chat-empty-title">{EMPTY_STATE_TITLE}</h2>
            <p class="guiders-chat-empty-body">{text}</p>
        </div>
    );
}
