/**
 * usePagination — Preact hook that manages loading and paginating chat messages.
 *
 * Strategy:
 * - Watches loadChatTriggerSignal (incremented by ChatUIBridge.initializeChat).
 * - On trigger: resets state, fetches the most-recent page, writes to messagesSignal.
 * - Exposes loadOlderMessages() for the ChatMessages component to call on scroll-to-top.
 *
 * Patches:
 *   #1 — Use `useSignalEffect` from `@preact/signals` instead of nesting
 *        `effect()` inside `useEffect`. This properly participates in the
 *        component lifecycle (StrictMode-safe, HMR-safe).
 *   #2 — Errors logged via `debugError`; expose `errorSignal` so the UI can
 *        render a retry affordance.
 *   #3 — Per-request token guards prevent stale responses from overwriting
 *        signals when the visitor switches chats rapidly.
 *   #4 — Replace opaque `Parameters<typeof MessageRenderer.fromMessageV2>[0]`
 *        with the real `MessageV2` type and drop the unsound `as Sender` cast.
 *   #5 — Explicit return type on the public hook.
 */

import { useRef, useCallback } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { MessagePaginationService } from '../../services/message-pagination-service';
import { MessageRenderer } from '../utils/message-renderer';
import { ChatMessageParams } from '../types/chat-types';
import { MessageV2 } from '../../types';
import {
    messagesSignal,
    paginationCursorSignal,
    hasMoreMessagesSignal,
    isPaginatingSignal,
    loadChatTriggerSignal,
    loadedChatIdSignal,
} from '../signals/messagesState';
import {
    chatIdSignal,
    isLoadingInitialMessagesSignal,
    paginationErrorSignal,
} from '../signals/chatState';
import { debugError } from '../../utils/debug-logger';

const MESSAGE_LIMIT = 20;

/** Converts a MessageV2 (from pagination service) into ChatMessageParams (signal format). */
function toMessageParams(raw: MessageV2): ChatMessageParams {
    const data = MessageRenderer.fromMessageV2(raw);
    return {
        text: data.content,
        // `data.sender` is already typed as `Sender` upstream — no cast needed.
        sender: data.sender,
        timestamp: data.timestamp
            ? typeof data.timestamp === 'number'
                ? data.timestamp
                : new Date(data.timestamp).getTime()
            : undefined,
        senderId: data.senderId,
        systemData: data.systemData,
        isAI: data.isAI,
        aiMetadata: data.aiMetadata,
    };
}

export interface UsePaginationResult {
    loadOlderMessages: () => Promise<void>;
}

export function usePagination(): UsePaginationResult {
    const service = useRef(MessagePaginationService.getInstance());
    // Track the trigger value we last acted on so we do not double-fire.
    // Initialise to -1 so that on mount the hook always processes the current
    // trigger value. This ensures that navigating back to the chat list and
    // re-selecting a chat (even the same one) always reloads messages.
    const lastTrigger = useRef(-1);
    // Patch #3: monotonic request token. Each load bumps this; only the
    // matching token is allowed to commit signal writes.
    const requestTokenRef = useRef(0);

    // ------------------------------------------------------------------
    // Load initial (most-recent) messages for the current chat
    // ------------------------------------------------------------------
    const loadInitial = useCallback(async (chatId: string) => {
        const myToken = ++requestTokenRef.current;
        isLoadingInitialMessagesSignal.value = true;
        paginationErrorSignal.value = null;
        paginationCursorSignal.value = null;
        hasMoreMessagesSignal.value = false;
        // Clear existing messages when switching chats
        messagesSignal.value = [];

        try {
            const response = await service.current.loadInitialMessages(chatId, MESSAGE_LIMIT);
            // Patch #3: discard stale responses.
            if (myToken !== requestTokenRef.current) return;
            if (chatIdSignal.peek() !== chatId) return;

            const params = [...response.messages].reverse().map(toMessageParams);
            messagesSignal.value = params;

            const cursor = response.cursor ?? response.nextCursor ?? null;
            paginationCursorSignal.value = response.hasMore ? cursor : null;
            hasMoreMessagesSignal.value = response.hasMore;
            loadedChatIdSignal.value = chatId;
        } catch (err) {
            if (myToken !== requestTokenRef.current) return;
            debugError('[usePagination] Error loading initial messages:', err);
            paginationErrorSignal.value = 'initial';
        } finally {
            if (myToken === requestTokenRef.current) {
                isLoadingInitialMessagesSignal.value = false;
            }
        }
    }, []);

    // ------------------------------------------------------------------
    // React to loadChatTriggerSignal changes (Patch #1)
    // ------------------------------------------------------------------
    useSignalEffect(() => {
        const trigger = loadChatTriggerSignal.value;
        const chatId = chatIdSignal.value;

        if (trigger === 0) return;                  // initial state — no-op
        if (trigger === lastTrigger.current) return; // already handled

        lastTrigger.current = trigger;

        if (!chatId) return;
        loadInitial(chatId);
    });

    // ------------------------------------------------------------------
    // Load older messages (scroll-to-top triggered)
    // ------------------------------------------------------------------
    const loadOlderMessages = useCallback(async (): Promise<void> => {
        const chatId = chatIdSignal.peek();
        const cursor = paginationCursorSignal.peek();

        if (!chatId || !cursor || !hasMoreMessagesSignal.peek()) return;
        if (isPaginatingSignal.peek()) return;

        const myToken = ++requestTokenRef.current;
        isPaginatingSignal.value = true;
        try {
            const response = await service.current.loadOlderMessages(chatId, cursor, MESSAGE_LIMIT);
            // Patch #3: discard stale responses.
            if (myToken !== requestTokenRef.current) return;
            if (chatIdSignal.peek() !== chatId) return;

            const older = [...response.messages].reverse().map(toMessageParams);

            // Prepend older messages, keeping existing (newer) ones
            messagesSignal.value = [...older, ...messagesSignal.value];

            const nextCursor = response.cursor ?? response.nextCursor ?? null;
            paginationCursorSignal.value = response.hasMore ? nextCursor : null;
            hasMoreMessagesSignal.value = response.hasMore;
        } catch (err) {
            if (myToken !== requestTokenRef.current) return;
            debugError('[usePagination] Error loading older messages:', err);
            paginationErrorSignal.value = 'older';
        } finally {
            if (myToken === requestTokenRef.current) {
                isPaginatingSignal.value = false;
            }
        }
    }, []);

    return { loadOlderMessages };
}
