/**
 * toggle-types — types consumed by the toggle button feature.
 *
 * Patch #28 (Chunk 2): moved `UnreadServiceConfig` here from
 * `signals/toggleState.ts`. The signals layer should declare state, not
 * types — same convention used by `chat-types.ts` and `quick-actions-types.ts`.
 */

/**
 * Configuration consumed by ToggleButton to wire up the
 * UnreadMessagesService. Set once at SDK initialisation via
 * `unreadServiceConfigSignal`.
 */
export interface UnreadServiceConfig {
    readonly visitorId: string;
    readonly onMessageReceived?: (chatId: string) => void;
    readonly autoOpenChatOnMessage?: boolean;
}
