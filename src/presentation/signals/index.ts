/**
 * Signals barrel.
 *
 * Patch #8 (Chunk 2): replaced `export *` with explicit named re-exports so
 * the public surface is auditable and adding a new symbol to a sub-module is
 * an *intentional* publication. With `export *`, a future helper accidentally
 * exported from a sub-module silently becomes part of the SDK's public API.
 *
 * Type re-exports for `UnreadServiceConfig` and `QuickActionSendPayload`
 * point at the types/ folder (Patches #28 / #29 moved them out of the signals
 * files where they used to live).
 */

// --- chatState ---
export {
    chatIdSignal,
    visitorIdSignal,
    chatDetailSignal,
    lastKnownChatStatusSignal,
    isVisibleSignal,
    isShowingChatListSignal,
    isCreatingChatSignal,
    isLoadingInitialMessagesSignal,
    presenceStatusSignal,
    assignedPresenceStatusSignal,
    showOfflineBannerSignal,
    offlineBannerEnabledSignal,
    isTypingSignal,
    lastManualCloseTimestampSignal,
    AUTO_OPEN_BLOCK_MS,
    chatSelectorEnabledSignal,
    offlineBannerTextSignal,
    chatInputPlaceholderSignal,
    hasAssignedCommercialSignal,
    paginationErrorSignal,
} from './chatState';

// --- messagesState ---
export {
    messagesSignal,
    sendMessageCallbackSignal,
    paginationCursorSignal,
    hasMoreMessagesSignal,
    isPaginatingSignal,
    loadChatTriggerSignal,
    loadedChatIdSignal,
} from './messagesState';
export type { SendMessageCallback } from './messagesState';

// --- presenceState ---
export { presenceServiceSignal, commercialPresenceMapSignal } from './presenceState';

// --- actionState ---
export {
    chatSwitchRequestSignal,
    newChatRequestSignal,
    quickActionSendMessageSignal,
    quickActionRequestAgentSignal,
    trackQuickActionSignal,
    chatInitializedSignal,
} from './actionState';
export type { QuickActionTrackPayload } from './actionState';

// --- toggleState ---
export {
    toggleButtonVisibleSignal,
    toggleChatOpenSignal,
    unreadCountSignal,
    toggleResolvedPositionSignal,
    toggleClickedSignal,
    activeChatForUnreadSignal,
    unreadServiceConfigSignal,
} from './toggleState';

// --- type re-exports (moved to types/ by Patches #28 / #29) ---
export type { UnreadServiceConfig } from '../types/toggle-types';
export type { QuickActionSendPayload } from '../types/quick-actions-types';
