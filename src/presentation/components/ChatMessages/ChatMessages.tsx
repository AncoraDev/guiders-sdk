import { Fragment, VNode } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import {
    messagesSignal,
    isLoadingInitialMessagesSignal,
    hasMoreMessagesSignal,
    isPaginatingSignal,
    chatDetailSignal,
} from '../../signals';
import { leadCaptureModeSignal } from '../../signals/leadCaptureState';
import { ChatMessageParams } from '../../types/chat-types';
import { useScrollToBottom } from '../../hooks';
import { usePagination } from '../../hooks/usePagination';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { LoadingIndicator } from './LoadingIndicator';
import { ContactRequestCard, isContactInteractiveMessage } from './ContactRequestCard';
import { ChatEmptyState } from '../ChatEmptyState';
import { LeadCaptureWizard, ThanksCard, isLeadCaptureMessage } from '../LeadCapture';
import {
    centeredThreadInnerStyle,
    centeredThreadStyle,
} from '../LeadCapture/LeadCaptureWizard.styles';

interface ChatMessagesProps {
    welcomeMessage?: string;
}

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

function isTransferMessage(msg: ChatMessageParams): boolean {
    if (msg.sender !== 'system') return false;
    if (msg.systemData?.action === 'transferred') return true;
    return /^transferido de /i.test((msg.text ?? '').trim());
}

function formatTransferTime(timestamp?: number): string | undefined {
    if (timestamp == null) return undefined;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Interleaves DateSeparator elements between messages whose dates differ.
 * Also computes isLastInGroup for Express-style gap spacing.
 */
function submittedRequestIds(messages: ChatMessageParams[]): Set<string> {
    const ids = new Set<string>();
    messages.forEach((msg) => {
        if (
            (msg.systemData?.action === 'contact_submission' ||
                msg.systemData?.action === 'contact_confirmation') &&
            msg.systemData.requestId
        ) {
            ids.add(msg.systemData.requestId);
        }
        if (msg.systemData?.action === 'contact_request' && (msg.systemData.status === 'submitted' || msg.systemData.status === 'confirmed') && msg.systemData.requestId) {
            ids.add(msg.systemData.requestId);
        }
    });
    return ids;
}

function cancelledRequestIds(messages: ChatMessageParams[]): Set<string> {
    const ids = new Set<string>();
    messages.forEach((msg) => {
        if (msg.systemData?.action === 'contact_cancellation' && msg.systemData.requestId) {
            ids.add(msg.systemData.requestId);
        }
        if (msg.systemData?.action === 'contact_request' && msg.systemData.status === 'cancelled' && msg.systemData.requestId) {
            ids.add(msg.systemData.requestId);
        }
    });
    return ids;
}

/** requestIds que tienen su solicitud original en el historial cargado. */
function knownRequestIds(messages: ChatMessageParams[]): Set<string> {
    const ids = new Set<string>();
    messages.forEach((msg) => {
        if (msg.systemData?.action === 'contact_request' && msg.systemData.requestId) {
            ids.add(msg.systemData.requestId);
        }
    });
    return ids;
}

/** Última solicitud del hilo (los mensajes llegan en orden cronológico). */
function latestRequestId(messages: ChatMessageParams[]): string | undefined {
    let latest: string | undefined;
    messages.forEach((msg) => {
        if (msg.systemData?.action === 'contact_request' && msg.systemData.requestId) {
            latest = msg.systemData.requestId;
        }
    });
    return latest;
}

function renderMessagesWithDateSeparators(messages: ChatMessageParams[]): VNode[] {
    const nodes: VNode[] = [];
    let lastDateKey = '';
    const submittedIds = submittedRequestIds(messages);
    const cancelledIds = cancelledRequestIds(messages);
    const requestIds = knownRequestIds(messages);
    const activeRequestId = latestRequestId(messages);

    messages.forEach((msg, idx) => {
        // Handoff system messages render as DateSeparator type='handoff', not a bubble
        if (msg.sender === 'system' && msg.text.startsWith('[handoff]')) {
            const label = msg.text.replace('[handoff]', '').trim();
            nodes.push(
                <DateSeparator key={messageKey(msg, idx)} type="handoff" label={label} />
            );
            return;
        }

        const contactAction = msg.systemData?.action;

        // Cancelación y confirmación solo cambian el estado de la tarjeta original:
        // nunca se pintan como tarjeta propia ni como burbuja de texto.
        if (
            contactAction === 'contact_cancellation' ||
            contactAction === 'contact_confirmation'
        ) {
            return;
        }

        // El cierre del asistente va en el sitio del envío, no al final del hilo.
        if (isLeadCaptureMessage(contactAction)) {
            const captureKey = getDateKey(msg.timestamp);
            if (captureKey !== lastDateKey) {
                nodes.push(
                    <DateSeparator key={`sep-${captureKey}`} date={getDate(msg.timestamp)} />
                );
                lastDateKey = captureKey;
            }
            nodes.push(
                <ThanksCard
                    key={messageKey(msg, idx)}
                    withoutContact={contactAction === 'lead_capture_closed'}
                />
            );
            return;
        }

        // El envío se refleja en la tarjeta de la solicitud; solo se pinta por su
        // cuenta si esa solicitud no está en el historial cargado.
        if (
            contactAction === 'contact_submission' &&
            msg.systemData?.requestId &&
            requestIds.has(msg.systemData.requestId)
        ) {
            return;
        }

        if (isContactInteractiveMessage(msg)) {
            const requestId = msg.systemData?.requestId;
            const isResolved =
                !!requestId &&
                (submittedIds.has(requestId) || cancelledIds.has(requestId));

            // Si el comercial vuelve a pedir los datos, las solicitudes anteriores ya
            // resueltas pierden su tarjeta para dejar una sola activa en el hilo.
            const isStaleRequest =
                contactAction === 'contact_request' &&
                isResolved &&
                requestId !== activeRequestId;

            const key = getDateKey(msg.timestamp);
            if (key !== lastDateKey) {
                nodes.push(
                    <DateSeparator key={`sep-${key}`} date={getDate(msg.timestamp)} />
                );
                lastDateKey = key;
            }

            // El comercial escribe el texto junto con la solicitud, pero en el hilo
            // se lee mejor como mensaje suyo y el formulario aparte.
            if (contactAction === 'contact_request') {
                const preface = (msg.systemData?.preface || msg.text || '').trim();
                if (preface) {
                    const commercialName = chatDetailSignal.value?.assignedCommercial?.name;
                    const authorName = msg.senderName || commercialName;
                    nodes.push(
                        <MessageBubble
                            key={`${messageKey(msg, idx)}:preface`}
                            message={{ ...msg, sender: 'agent', text: preface, systemData: undefined }}
                            isLastInGroup
                            authorName={authorName}
                            authorInitial={authorName?.[0]?.toUpperCase()}
                        />
                    );
                }
            }

            if (isStaleRequest) {
                return;
            }

            nodes.push(
                <ContactRequestCard
                    key={messageKey(msg, idx)}
                    message={msg}
                    alreadySubmitted={!!requestId && submittedIds.has(requestId)}
                    alreadyCancelled={!!requestId && cancelledIds.has(requestId)}
                />
            );
            return;
        }

        // Transferencia: mismo patrón visual que Console (pill + líneas)
        if (isTransferMessage(msg)) {
            const key = getDateKey(msg.timestamp);
            if (key !== lastDateKey) {
                nodes.push(
                    <DateSeparator key={`sep-${key}`} date={getDate(msg.timestamp)} />
                );
                lastDateKey = key;
            }
            nodes.push(
                <DateSeparator
                    key={messageKey(msg, idx)}
                    type="transfer"
                    label={msg.text}
                    timeLabel={formatTransferTime(msg.timestamp)}
                />
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
        const commercialName = chatDetailSignal.value?.assignedCommercial?.name;
        const authorName = msg.senderName || commercialName;
        nodes.push(
            <MessageBubble
                key={messageKey(msg, idx)}
                message={msg}
                isLastInGroup={isLastInGroup}
                authorName={authorName}
                authorInitial={authorName?.[0]?.toUpperCase()}
            />
        );
    });

    return nodes;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function hasRealConversationMessages(messages: ChatMessageParams[]): boolean {
    return messages.some(
        (m) =>
            (m.sender !== 'system' && m.sender !== 'consent') ||
            isLeadCaptureMessage(m.systemData?.action)
    );
}

export function ChatMessages({ welcomeMessage }: ChatMessagesProps) {
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

    // Modo `thread`: sin nadie atendiendo y sin conversación que tapar, el
    // asistente es la única vía y ocupa el hilo entero. En modo `offer` el hilo
    // se pinta normal y el asistente se ofrece como última tarjeta.
    if (leadCaptureModeSignal.value === 'thread') {
        return (
            <div class="chat-messages" ref={containerRef} style={centeredThreadStyle}>
                <div style={centeredThreadInnerStyle}>
                    <LeadCaptureWizard centered />
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div class="chat-messages" ref={containerRef}>
                <LoadingIndicator />
            </div>
        );
    }

    const showEmptyState = !hasRealConversationMessages(messages);

    return (
        <div
            class={`chat-messages${showEmptyState ? ' chat-messages--empty' : ''}`}
            ref={containerRef}
            style={{ position: 'relative' }}
        >
            {/* Top sentinel — triggers loading older messages on scroll-to-top */}
            {hasMore && (
                <div ref={sentinelRef} class="chat-pagination-sentinel">
                    {isPaginating && <LoadingIndicator compact />}
                </div>
            )}

            {showEmptyState
                ? <ChatEmptyState body={welcomeMessage} />
                : renderMessagesWithDateSeparators(messages)}

            {/* Asistente de captación: tarjeta de oferta o cierre según el modo */}
            <LeadCaptureWizard />
        </div>
    );
}
