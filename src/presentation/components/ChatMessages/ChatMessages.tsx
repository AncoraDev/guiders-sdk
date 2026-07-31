import { Fragment, VNode } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import {
    messagesSignal,
    isLoadingInitialMessagesSignal,
    hasMoreMessagesSignal,
    isPaginatingSignal,
} from '../../signals';
import { ChatMessageParams } from '../../types/chat-types';
import { useScrollToBottom } from '../../hooks';
import { usePagination } from '../../hooks/usePagination';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { LoadingIndicator } from './LoadingIndicator';

// ---------------------------------------------------------------------------
// Date separator helpers
// ---------------------------------------------------------------------------

function getDateKey(timestamp?: number): string {
    const d = timestamp ? new Date(timestamp) : new Date();
    return d.toDateString();
}

function getDate(timestamp?: number): Date {
    return timestamp ? new Date(timestamp) : new Date();
}

/**
 * Build a stable identity for a message so Preact does not remount bubbles when
 * older messages are prepended (Patch #4). Falls back to a content hash when
 * no id/timestamp+senderId combo is available.
 */
function messageKey(msg: ChatMessageParams, index: number): string {
    const anyMsg = msg as ChatMessageParams & { id?: string };
    if (anyMsg.id) return `id:${anyMsg.id}`;
    if (msg.timestamp != null && msg.senderId) return `ts:${msg.timestamp}:${msg.senderId}`;
    if (msg.timestamp != null) return `ts:${msg.timestamp}:${msg.sender}`;
    // Last resort: combine sender + text + index. Stable as long as the
    // surrounding messages don't shift identity unexpectedly.
    return `f:${msg.sender}:${index}:${(msg.text ?? '').slice(0, 32)}`;
}

/**
 * Resolve the author type for grouping purposes (mirrors logic in MessageBubble).
 */
function resolveGroupKey(msg: ChatMessageParams): string {
    if (msg.sender === 'system')  return 'system';
    if (msg.sender === 'consent') return 'consent';
    if (msg.sender === 'user') return 'user';
    // Mensajes IA/agente se agrupan como humano (sin UI de IA).
    return `human:${msg.senderId ?? msg.sender}`;
}

/**
 * Interleaves DateSeparator elements between messages whose dates differ.
 * Also computes isLastInGroup for Express-style gap spacing.
 */
function renderMessagesWithDateSeparators(messages: ChatMessageParams[]): VNode[] {
    const nodes: VNode[] = [];
    let lastDateKey = '';

    messages.forEach((msg, idx) => {
        // Handoff system messages render as DateSeparator type='handoff', not a bubble
        if (msg.sender === 'system' && msg.text.startsWith('[handoff]')) {
            const label = msg.text.replace('[handoff]', '').trim();
            nodes.push(
                <DateSeparator key={messageKey(msg, idx)} type="handoff" label={label} />
            );
            return;
        }

        const key = getDateKey(msg.timestamp);
        if (key !== lastDateKey) {
            nodes.push(
                <DateSeparator key={`sep-${key}`} date={getDate(msg.timestamp)} />
            );
            lastDateKey = key;
        }
        const next = messages[idx + 1];
        const currentGroup = resolveGroupKey(msg);
        const nextGroup = next ? resolveGroupKey(next) : null;
        const isLastInGroup = currentGroup !== nextGroup || next == null;
        nodes.push(
            <MessageBubble key={messageKey(msg, idx)} message={msg} isLastInGroup={isLastInGroup} />
        );
    });

    return nodes;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatMessages() {
    const messages = messagesSignal.value;
    const isLoading = isLoadingInitialMessagesSignal.value;
    const hasMore = hasMoreMessagesSignal.value;
    const isPaginating = isPaginatingSignal.value;

    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    /** Patch #2: skip the very first IntersectionObserver fire so we don't
     *  trigger pagination on mount when the sentinel is already in view. */
    const armedRef = useRef<boolean>(false);
    /** Patch #3: when prepending older messages, preserve scroll offset
     *  so the user is not yanked back to the bottom. */
    const prevScrollHeightRef = useRef<number>(0);
    const wasPaginatingRef = useRef<boolean>(false);

    // Activate pagination logic (watches loadChatTriggerSignal)
    const { loadOlderMessages } = usePagination();

    // Patch #3: Auto-scroll to bottom for new messages, but suppress while
    // a pagination request is in flight (prepending older messages).
    useScrollToBottom(containerRef, [messages], { enabled: !isPaginating });

    // Patch #3: capture scrollHeight just before pagination resolves so we can
    // restore the scroll offset relative to the previously-visible content.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (isPaginating && !wasPaginatingRef.current) {
            // Pagination just started — record the current scroll height.
            prevScrollHeightRef.current = container.scrollHeight;
        } else if (!isPaginating && wasPaginatingRef.current) {
            // Pagination just finished — restore scroll position.
            const delta = container.scrollHeight - prevScrollHeightRef.current;
            if (delta > 0) {
                container.scrollTop = container.scrollTop + delta;
            }
        }
        wasPaginatingRef.current = isPaginating;
    }, [isPaginating, messages]);

    // Patch #1: IntersectionObserver must re-attach when `hasMore` flips
    // (sentinel is conditionally rendered). Including hasMore in deps fixes
    // the stale-observer bug.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) {
            armedRef.current = false;
            return;
        }

        // Reset arming whenever we (re-)attach to a new sentinel node.
        armedRef.current = false;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                // Patch #2: skip the initial intersection fired on mount.
                if (!armedRef.current) {
                    armedRef.current = true;
                    return;
                }
                // Patch #3: don't kick off pagination if one is already in flight.
                if (isPaginatingSignal.peek()) return;
                loadOlderMessages();
            },
            {
                root: containerRef.current,
                threshold: 0.1,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadOlderMessages, hasMore]);

    if (isLoading) {
        return (
            <div class="chat-messages" ref={containerRef}>
                <LoadingIndicator />
            </div>
        );
    }

    return (
        <div class="chat-messages" ref={containerRef} style={{ position: 'relative' }}>
            {/* Top sentinel — triggers loading older messages on scroll-to-top */}
            {hasMore && (
                <div ref={sentinelRef} class="chat-pagination-sentinel">
                    {isPaginating && <LoadingIndicator compact />}
                </div>
            )}

            {renderMessagesWithDateSeparators(messages)}
        </div>
    );
}
