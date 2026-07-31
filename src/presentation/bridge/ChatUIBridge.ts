import { effect } from '@preact/signals-core';
import { ChatUIOptions, ChatMessageParams, Sender } from '../types/chat-types';
import { resolvePosition, ResolvedPosition } from '../../utils/position-resolver';
import { PresenceService } from '../../services/presence-service';
import type { PresenceLike } from '../types/presence-types';
import { AssignedCommercialInfo, ChatStatus } from '../../types/websocket-types';
import { fetchChatDetail } from '../../services/chat-detail-service';
import { ChatV2 } from '../../types';
import { debugLog, debugWarn, debugError } from '../../utils/debug-logger';
import {
    isVisibleSignal,
    isShowingChatListSignal,
    chatIdSignal,
    visitorIdSignal,
    isLoadingInitialMessagesSignal,
    isCreatingChatSignal,
    chatDetailSignal,
    lastKnownChatStatusSignal,
    hasAssignedCommercialSignal,
    presenceServiceSignal,
    showOfflineBannerSignal,
    offlineBannerEnabledSignal,
    lastManualCloseTimestampSignal,
    AUTO_OPEN_BLOCK_MS,
    chatSwitchRequestSignal,
    newChatRequestSignal,
    quickActionSendMessageSignal,
    quickActionRequestAgentSignal,
    trackQuickActionSignal,
    chatInitializedSignal,
    chatSelectorEnabledSignal,
} from '../signals';
import { messagesSignal, sendMessageCallbackSignal, loadChatTriggerSignal, loadedChatIdSignal } from '../signals/messagesState';
import {
    toggleClickedSignal,
    toggleChatOpenSignal,
    toggleResolvedPositionSignal,
} from '../signals/toggleState';
import { isTypingSignal, offlineBannerTextSignal, chatInputPlaceholderSignal } from '../signals/chatState';
import { mountChatWidget } from '../components/ChatWidget';
import { mountConsentBanner } from '../components/ConsentBanner';
import { ConsentBannerConfig } from '../types/consent-types';
import { ToggleBridge } from './ToggleBridge';

/** Default timeout for waitForChatCreation, in ms. */
const CHAT_CREATION_TIMEOUT_MS = 30_000;

/** Default page size for visitor chat lookups. TODO: make configurable (deferred-work). */
const VISITOR_CHAT_PAGE_SIZE = 50;

/**
 * ChatUIBridge — implements the full ChatUI public API using Preact signals.
 * No legacy ChatUI instance is retained. All state is driven by signals.
 */
export class ChatUIBridge {
    /** Module-level guard: prevents duplicate init() across multiple instances.
     *  Mirrors the idempotency guard in mountChatWidget (Shadow DOM check) but
     *  also covers the signal-effect registration to avoid duplicate handlers
     *  when grantConsent*() triggers a second SDK init() (known SDK limitation).
     */
    private static _globalInitialized = false;

    private _options: ChatUIOptions;
    private _resolvedPosition: ResolvedPosition;
    private _shadowHost: HTMLElement | null = null;
    /** Patch #5: dispose function returned by mountChatWidget — tears down style effect + tree. */
    private _shadowDispose: (() => void) | null = null;

    /** Patch #1: idempotency + lifecycle disposers */
    private _initialized = false;
    private _disposers: Array<() => void> = [];
    private _consentBannerDispose: (() => void) | null = null;

    /** Delegate for all toggle-button concerns */
    readonly toggleBridge: ToggleBridge = new ToggleBridge();

    // -------------------------------------------------------------------------
    // Internal callback stores — written by SDK, fired by effects on action signals.
    // Patch #7: support multiple subscribers for chat-init / submit / send-message.
    // -------------------------------------------------------------------------

    private _onChatSwitch: ((chatId: string) => Promise<void>) | null = null;
    private _onNewChatRequest: (() => Promise<void>) | null = null;
    private _onQuickActionSendMessage: ((message: string, metadata?: Record<string, unknown>) => Promise<void>) | null = null;
    private _onQuickActionRequestAgent: (() => Promise<void>) | null = null;
    private _onTrackQuickAction: ((data: Record<string, unknown>) => void) | null = null;
    private _onChatInitializedCallbacks: Array<() => void> = [];

    // -------------------------------------------------------------------------
    // Public callback properties — API surface kept for TrackingPixelSDK
    // -------------------------------------------------------------------------

    get onChatSwitch(): ((chatId: string) => Promise<void>) | null {
        return this._onChatSwitch;
    }
    set onChatSwitch(value: ((chatId: string) => Promise<void>) | null) {
        this._onChatSwitch = value;
    }

    get onNewChatRequest(): (() => Promise<void>) | null {
        return this._onNewChatRequest;
    }
    set onNewChatRequest(value: (() => Promise<void>) | null) {
        this._onNewChatRequest = value;
    }

    get onQuickActionSendMessage(): ((message: string, metadata?: Record<string, unknown>) => Promise<void>) | null {
        return this._onQuickActionSendMessage;
    }
    set onQuickActionSendMessage(value: ((message: string, metadata?: Record<string, unknown>) => Promise<void>) | null) {
        this._onQuickActionSendMessage = value;
    }

    get onQuickActionRequestAgent(): (() => Promise<void>) | null {
        return this._onQuickActionRequestAgent;
    }
    set onQuickActionRequestAgent(value: (() => Promise<void>) | null) {
        this._onQuickActionRequestAgent = value;
    }

    get onTrackQuickAction(): ((data: Record<string, unknown>) => void) | null {
        return this._onTrackQuickAction;
    }
    set onTrackQuickAction(value: ((data: Record<string, unknown>) => void) | null) {
        this._onTrackQuickAction = value;
    }

    constructor(options: ChatUIOptions = {}) {
        this._options = options;
        this._resolvedPosition = resolvePosition(options.position, options.mobileDetection);

        // Seed chatSelectorEnabled from static options so the header shows correctly on first render
        if (options.chatSelector?.enabled) {
            chatSelectorEnabledSignal.value = true;
        }

        // Patch #13: seed configurable UI texts from options at construction time
        // so the first render already reflects the consumer's overrides.
        if (options.offlineBanner?.text) {
            offlineBannerTextSignal.value = options.offlineBanner.text;
        }
        if (options.chatInput?.placeholder) {
            chatInputPlaceholderSignal.value = options.chatInput.placeholder;
        }
    }

    // -------------------------------------------------------------------------
    // Lifecycle — PREACT
    // -------------------------------------------------------------------------

    /**
     * Patch #1: idempotent init + tracked disposers so destroy() can fully clean up.
     * Patch #14: global guard prevents duplicate signal effects when SDK re-inits
     * after consent grant (grantConsent* calls this.init() unconditionally).
     */
    init(): void {
        if (this._initialized) {
            debugWarn('[ChatUIBridge] init() called more than once on same instance — ignored');
            return;
        }
        if (ChatUIBridge._globalInitialized) {
            debugWarn('[ChatUIBridge] init() called on a second instance — Shadow DOM already mounted, skipping');
            return;
        }
        this._initialized = true;
        ChatUIBridge._globalInitialized = true;

        const mounted = mountChatWidget(this._options, this._resolvedPosition);
        this._shadowHost = mounted.host;
        this._shadowDispose = mounted.dispose;

        // Track manual closes for canAutoOpen() throttle.
        let prevVisible = isVisibleSignal.peek();
        this._disposers.push(effect(() => {
            const current = isVisibleSignal.value;
            if (!current && prevVisible) {
                lastManualCloseTimestampSignal.value = Date.now();
            }
            prevVisible = current;
        }));

        // Action signal effects — bridge the gap between UI signals and SDK callbacks.
        // Each effect reads the signal, calls the stored callback, then resets the signal.
        // Patch #8: wrap async callbacks so a rejection doesn't escape into the effect.

        this._disposers.push(effect(() => {
            const chatId = chatSwitchRequestSignal.value;
            if (chatId !== null) {
                chatSwitchRequestSignal.value = null;
                this._onChatSwitch?.(chatId).catch((err) => debugError('[ChatUIBridge] onChatSwitch failed:', err));
            }
        }));

        let prevNewChatPulse = newChatRequestSignal.peek();
        this._disposers.push(effect(() => {
            const pulse = newChatRequestSignal.value;
            if (pulse !== prevNewChatPulse) {
                prevNewChatPulse = pulse;
                this._onNewChatRequest?.().catch((err) => debugError('[ChatUIBridge] onNewChatRequest failed:', err));
            }
        }));

        this._disposers.push(effect(() => {
            const payload = quickActionSendMessageSignal.value;
            if (payload !== null) {
                quickActionSendMessageSignal.value = null;
                this._onQuickActionSendMessage?.(payload.message, payload.metadata)
                    .catch((err) => debugError('[ChatUIBridge] onQuickActionSendMessage failed:', err));
            }
        }));

        let prevAgentPulse = quickActionRequestAgentSignal.peek();
        this._disposers.push(effect(() => {
            const pulse = quickActionRequestAgentSignal.value;
            if (pulse !== prevAgentPulse) {
                prevAgentPulse = pulse;
                this._onQuickActionRequestAgent?.()
                    .catch((err) => debugError('[ChatUIBridge] onQuickActionRequestAgent failed:', err));
            }
        }));

        this._disposers.push(effect(() => {
            const data = trackQuickActionSignal.value;
            if (data !== null) {
                trackQuickActionSignal.value = null;
                try {
                    // Patch #10 (Chunk 2): widen the typed payload back to
                    // Record<string, unknown> at this boundary so the public
                    // callback contract consumed by TrackingPixelSDK (which is
                    // out-of-scope per PRD) stays unchanged.
                    this._onTrackQuickAction?.({ ...data });
                } catch (err) {
                    debugError('[ChatUIBridge] onTrackQuickAction threw:', err);
                }
            }
        }));

        let prevInitPulse = chatInitializedSignal.peek();
        this._disposers.push(effect(() => {
            const pulse = chatInitializedSignal.value;
            if (pulse !== prevInitPulse) {
                prevInitPulse = pulse;
                this._fireChatInitialized();
            }
        }));

        // Seed toggle position signal
        toggleResolvedPositionSignal.value = this._resolvedPosition;

        // Wire toggle button clicks → fire toggle callbacks (Patch #10: pulse payload)
        let prevTogglePulse = toggleClickedSignal.peek();
        this._disposers.push(effect(() => {
            const pulse = toggleClickedSignal.value;
            if (pulse !== prevTogglePulse) {
                prevTogglePulse = pulse;
                const nowOpen = !toggleChatOpenSignal.peek();
                toggleChatOpenSignal.value = nowOpen;
                this.toggleBridge.fireToggleCallbacks(nowOpen);
            }
        }));

        // Patch #13: when presence service changes, dispose previous one
        // Patch #6 (Chunk 2): typed against PresenceLike since the signal now
        // holds the structural interface rather than the concrete service.
        let prevPresence: PresenceLike | null = presenceServiceSignal.peek();
        this._disposers.push(effect(() => {
            const next = presenceServiceSignal.value;
            if (prevPresence && prevPresence !== next && typeof (prevPresence as unknown as { dispose?: () => void }).dispose === 'function') {
                try {
                    (prevPresence as unknown as { dispose: () => void }).dispose();
                } catch (err) {
                    debugError('[ChatUIBridge] Previous PresenceService.dispose() threw:', err);
                }
            }
            prevPresence = next;
        }));
    }

    /**
     * Patch #1: tear down all effects, unmount consent banner, and reset state
     * so the bridge can be safely re-initialised (e.g. tests, hot reload).
     */
    destroy(): void {
        this._disposers.forEach((d) => {
            try { d(); } catch (err) { debugError('[ChatUIBridge] Disposer threw:', err); }
        });
        this._disposers = [];
        if (this._consentBannerDispose) {
            try { this._consentBannerDispose(); } catch (err) { debugError('[ChatUIBridge] Consent banner cleanup threw:', err); }
            this._consentBannerDispose = null;
        }
        this._initialized = false;
        ChatUIBridge._globalInitialized = false;
        // Patch #5: tear down the Preact tree + style effect, then drop refs.
        if (this._shadowDispose) {
            try { this._shadowDispose(); } catch (err) { debugError('[ChatUIBridge] shadow dispose threw:', err); }
            this._shadowDispose = null;
        }
        this._shadowHost = null;
    }

    // -------------------------------------------------------------------------
    // Visibility — PREACT signals
    // -------------------------------------------------------------------------

    show(): void {
        isVisibleSignal.value = true;
    }

    hide(): void {
        isVisibleSignal.value = false;
    }

    // -------------------------------------------------------------------------
    // Chat input — replaces ChatInputUI.onSubmit
    // -------------------------------------------------------------------------

    /**
     * Registers the send-message handler (same as ChatInputUI.onSubmit).
     * Patch #23: wrap to reject empty / whitespace-only messages before invoking the SDK.
     *
     * Optimistic UI: the message is appended to messagesSignal immediately with
     * a temporary id. If the async callback rejects, the optimistic message is
     * removed so the user sees the failure without a ghost bubble.
     */
    onSubmit(callback: (message: string) => void | Promise<void>): void {
        sendMessageCallbackSignal.value = (message: string) => {
            if (typeof message !== 'string' || message.trim().length === 0) {
                debugWarn('[ChatUIBridge] onSubmit invoked with empty message — ignored');
                return;
            }

            // ── Optimistic append ─────────────────────────────────────────────
            const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const optimisticMsg = {
                text: message,
                sender: 'user' as const,
                timestamp: Date.now(),
                id: optimisticId,
            } satisfies ChatMessageParams & { id: string };
            this.appendMessage(optimisticMsg);

            // ── Invoke SDK callback ───────────────────────────────────────────
            try {
                const result = callback(message);
                if (result && typeof result.then === 'function') {
                    result.then(undefined, (err: unknown) => {
                        // Send failed — remove the optimistic bubble
                        debugError('[ChatUIBridge] onSubmit async callback failed, removing optimistic message:', err);
                        messagesSignal.value = messagesSignal.value.filter(
                            (m) => (m as ChatMessageParams & { id?: string }).id !== optimisticId
                        );
                    });
                }
            } catch (err) {
                // Sync throw — remove the optimistic bubble immediately
                debugError('[ChatUIBridge] onSubmit callback threw, removing optimistic message:', err);
                messagesSignal.value = messagesSignal.value.filter(
                    (m) => (m as ChatMessageParams & { id?: string }).id !== optimisticId
                );
            }
        };
    }

    toggle(): void {
        isVisibleSignal.value = !isVisibleSignal.value;
    }

    isVisible(): boolean {
        return isVisibleSignal.value;
    }

    canAutoOpen(): boolean {
        const timeSinceClose = Date.now() - lastManualCloseTimestampSignal.value;
        return timeSinceClose > AUTO_OPEN_BLOCK_MS;
    }

    // -------------------------------------------------------------------------
    // Messages — PREACT signals
    // -------------------------------------------------------------------------

    /** Patch #9: centralised append helper — single source of truth for message mutations. */
    private appendMessage(params: ChatMessageParams): void {
        messagesSignal.value = [...messagesSignal.value, params];
    }

    renderChatMessage(params: ChatMessageParams): void {
        // Dedup: if an optimistic bubble with the same text from the same sender
        // already exists (added < 10 s ago), skip this call to avoid a duplicate.
        // This covers SDK paths that call renderChatMessage after the HTTP response
        // when optimistic UI has already displayed the message.
        if (params.sender === 'user') {
            const DEDUP_WINDOW_MS = 10_000;
            const now = Date.now();
            const duplicate = messagesSignal.value.some((m) => {
                const withId = m as ChatMessageParams & { id?: string };
                return (
                    withId.id?.startsWith('optimistic-') &&
                    m.sender === 'user' &&
                    m.text === params.text &&
                    m.timestamp != null &&
                    now - m.timestamp < DEDUP_WINDOW_MS
                );
            });
            if (duplicate) {
                debugLog('[ChatUIBridge] renderChatMessage: skipping duplicate of optimistic user bubble');
                return;
            }
        }
        this.appendMessage(params);
    }

    /**
     * Patch #3: preserve BOTH 'system' AND 'consent' messages when clearing.
     * The consent banner must survive history reloads; system messages are
     * informational and shouldn't be wiped by a server-driven message refresh.
     */
    clearMessages(): void {
        messagesSignal.value = messagesSignal.value.filter(
            (m) => m.sender === 'system' || m.sender === 'consent'
        );
    }

    showLoadingMessages(): void {
        isLoadingInitialMessagesSignal.value = true;
    }

    hideLoadingMessages(): void {
        isLoadingInitialMessagesSignal.value = false;
    }

    setLoadingInitialMessages(loading: boolean): void {
        isLoadingInitialMessagesSignal.value = loading;
    }

    isLoadingMessages(): boolean {
        return isLoadingInitialMessagesSignal.value;
    }

    /** Returns the Preact messages container element from the Shadow DOM, if mounted. */
    getMessagesContainer(): HTMLElement | null {
        if (!this._shadowHost) return null;
        const root = this._shadowHost.shadowRoot;
        if (!root) return null;
        return root.querySelector<HTMLElement>('.chat-messages');
    }

    scrollToBottom(_scrollToBottom: boolean): void {
        const container = this.getMessagesContainer();
        if (container) container.scrollTop = container.scrollHeight;
    }

    scrollToBottomV2(): void {
        const container = this.getMessagesContainer();
        if (container) container.scrollTop = container.scrollHeight;
    }

    addSystemMessage(text: string): void {
        this.appendMessage({ text, sender: 'system' });
    }

    /**
     * Quita del hilo los mensajes de sistema de disponibilidad de soporte
     * (cabecera ya comunica ese estado; no deben quedar en el historial).
     */
    clearAvailabilitySystemMessages(): void {
        const availabilityRe =
            /^(Soporte conectado —|Soporte no disponible|No hay personas disponibles ahora mismo)/;
        messagesSignal.value = messagesSignal.value.filter(
            (m) => !(m.sender === 'system' && availabilityRe.test(m.text ?? ''))
        );
    }

    /**
     * Adds the GDPR consent message as a system message if not already present.
     * MessageBubble renders all messages with sender === 'consent' inline (Patch #10).
     * Patch #16: Sender union now includes 'consent', no double-cast required.
     * Patch #27: track that the consent banner is active in this conversation.
     */
    addChatConsentMessage(): void {
        const consentConfig = this._options.chatConsentMessage;
        if (!consentConfig?.enabled) return;

        // Avoid duplicates
        const alreadyAdded = messagesSignal.value.some((m) => m.sender === 'consent');
        if (alreadyAdded) return;

        messagesSignal.value = [
            { text: consentConfig.message ?? '', sender: 'consent' },
            ...messagesSignal.value,
        ];
    }

    /**
     * If the messages list is empty, inserts the consent message and shows QuickActions.
     * Called by TrackingPixelSDK after the chat is opened and history is loaded.
     */
    checkAndAddInitialMessages(): void {
        if (isLoadingInitialMessagesSignal.value) return;

        const realMessages = messagesSignal.value.filter(
            (m) => m.sender !== 'system' && m.sender !== 'consent'
        );

        if (realMessages.length === 0) {
            this.addChatConsentMessage();
            // QuickActions visibility is driven by their own signal / rendered by QuickActions component
        }
    }

    /**
     * Registers the callback invoked when the visitor sends a message via ChatInput.
     * Called by TrackingPixelSDK after the bridge is initialised.
     */
    onSendMessage(callback: (message: string) => void): void {
        // Reuse the same wrap-and-validate logic as onSubmit (Patch #23).
        this.onSubmit(callback);
    }

    /**
     * Updates the typing indicator signal when the commercial starts/stops typing.
     * Called by the WebSocket event handler in TrackingPixelSDK.
     */
    setCommercialTyping(isTyping: boolean): void {
        isTypingSignal.value = isTyping;
    }

    // -------------------------------------------------------------------------
    // Chat state — PREACT signals
    // -------------------------------------------------------------------------

    /**
     * Patch #5: when chatId is cleared (empty string), reset BOTH chatIdSignal
     * AND loadedChatIdSignal so the next initializeChat() call doesn't
     * short-circuit on stale equality.
     */
    setChatId(chatId: string): void {
        if (chatId === '') {
            chatIdSignal.value = null;
            loadedChatIdSignal.value = null;
            return;
        }
        chatIdSignal.value = chatId;
    }

    getChatId(): string | null {
        return chatIdSignal.value;
    }

    /**
     * Loads (or reloads) messages for the given chat.
     * Increments loadChatTriggerSignal so the usePagination hook fetches fresh data.
     * Equivalent to the former ChatMessagesUI.initializeChat().
     *
     * Patches:
     *   #6 — no longer async; nothing inside awaits.
     *   #11 — reject empty chatId (no point loading messages for nothing).
     */
    initializeChat(chatId: string, force: boolean = false): void {
        if (typeof chatId !== 'string' || chatId.trim().length === 0) {
            debugWarn('[ChatUIBridge] initializeChat called with empty chatId — ignored');
            return;
        }
        if (chatId === loadedChatIdSignal.value && !force) return;
        chatIdSignal.value = chatId;
        // Increment trigger — usePagination hook will pick this up and load messages
        loadChatTriggerSignal.value = (loadChatTriggerSignal.value || 0) + 1;
        // Always refresh chat details so avatar, name and presence status reflect
        // the current state — even on first open when no prior detail is cached.
        this.refreshChatDetails(force).catch((err) => {
            debugError('[ChatUIBridge] initializeChat: refreshChatDetails failed:', err);
        });
    }

    /**
     * Returns true if the Preact messages list is already loaded for the given chatId.
     * Equivalent to the former ChatMessagesUI.isChatInitialized().
     */
    isChatInitialized(chatId?: string): boolean {
        if (chatId) return loadedChatIdSignal.value === chatId;
        return loadedChatIdSignal.value !== null;
    }

    setVisitorId(visitorId: string): void {
        visitorIdSignal.value = visitorId;
    }

    getVisitorId(): string | null {
        return visitorIdSignal.value;
    }

    getLastKnownChatStatus(): string | null {
        return lastKnownChatStatusSignal.value;
    }

    setCreatingChat(isCreating: boolean): void {
        isCreatingChatSignal.value = isCreating;
    }

    isCreatingChat(): boolean {
        return isCreatingChatSignal.value;
    }

    /**
     * Resolves once isCreatingChatSignal flips to false.
     *
     * Patches:
     *   #2 — fix TDZ: declare `dispose` with `let` first, then assign from `effect()`.
     *        The original `const dispose = effect(...)` failed because the inner
     *        callback could fire synchronously before the binding was initialised.
     *   #12 — add a 30-second safety timeout to avoid hanging promises if the
     *        creating-chat flag is never cleared (network drop, server bug).
     */
    waitForChatCreation(): Promise<void> {
        if (!isCreatingChatSignal.value) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            let dispose: (() => void) | null = null;
            const timeoutId = setTimeout(() => {
                if (dispose) dispose();
                reject(new Error(`waitForChatCreation timed out after ${CHAT_CREATION_TIMEOUT_MS}ms`));
            }, CHAT_CREATION_TIMEOUT_MS);

            dispose = effect(() => {
                if (!isCreatingChatSignal.value) {
                    clearTimeout(timeoutId);
                    if (dispose) dispose();
                    resolve();
                }
            });
        });
    }

    // -------------------------------------------------------------------------
    // Header / commercial — PREACT signals (Story 3.1)
    // -------------------------------------------------------------------------

    /**
     * Patch #19: validate chatDetailSignal before spreading. When no chat detail
     * is loaded yet, build a minimal partial object instead of spreading `{}` cast
     * to ChatV2 (which would create an invalid ChatV2 with missing required fields).
     */
    updateHeaderWithCommercial(commercial: AssignedCommercialInfo, newStatus?: string): void {
        const current = chatDetailSignal.value;
        if (current) {
            chatDetailSignal.value = {
                ...current,
                assignedCommercial: {
                    id: commercial.id,
                    name: commercial.name,
                    avatarUrl: commercial.avatarUrl,
                },
            };
        } else {
            // No detail loaded yet — only the assignedCommercial is reliably known.
            chatDetailSignal.value = {
                assignedCommercial: {
                    id: commercial.id,
                    name: commercial.name,
                    avatarUrl: commercial.avatarUrl,
                },
            } as ChatV2;
        }

        if (newStatus !== undefined) {
            lastKnownChatStatusSignal.value = newStatus as ChatStatus;
        }
    }

    resetHeaderToDefault(): void {
        if (chatDetailSignal.value) {
            chatDetailSignal.value = {
                ...chatDetailSignal.value,
                assignedCommercial: undefined,
            };
        }
        lastKnownChatStatusSignal.value = null;
    }

    hasAssignedCommercial(): boolean {
        return hasAssignedCommercialSignal.value;
    }

    // -------------------------------------------------------------------------
    // Chat list / selector — PREACT signals (Story 4.2)
    // -------------------------------------------------------------------------

    showChatListView(): void {
        isShowingChatListSignal.value = true;
    }

    hideChatListView(): void {
        isShowingChatListSignal.value = false;
    }

    updateSelectedChat(chatId: string | null): void {
        if (chatId !== null) chatIdSignal.value = chatId;
    }

    /**
     * Fires the chat-switch signal — the SDK's effect handler will pick it up
     * and load the new chat, exactly as when the user clicks from the chat list.
     */
    async switchToChat(chatId: string): Promise<void> {
        chatSwitchRequestSignal.value = chatId;
    }

    /**
     * Fires the new-chat-request pulse signal — the SDK's effect handler will
     * create the chat and update state accordingly.
     */
    async createNewChat(): Promise<void> {
        newChatRequestSignal.value = (newChatRequestSignal.value ?? 0) + 1;
    }

    /**
     * Enables or disables the multi-chat selector (back button in the header).
     */
    setChatSelectorEnabled(enabled: boolean): void {
        chatSelectorEnabledSignal.value = enabled;
    }

    // -------------------------------------------------------------------------
    // Presence / offline — PREACT signals (Story 3.2)
    // -------------------------------------------------------------------------

    setPresenceService(presenceService: PresenceService): void {
        presenceServiceSignal.value = presenceService;
    }

    /**
     * Habilita/deshabilita el banner de comercial offline.
     * No fuerza la visibilidad al activar: usePresence decide según presencia real.
     * (Forzar show=true al enable provocaba "Sin conexión" en chats PENDING sin agente.)
     */
    setShowOfflineBanner(enabled: boolean): void {
        offlineBannerEnabledSignal.value = enabled;
        if (!enabled) {
            showOfflineBannerSignal.value = false;
        }
    }

    // -------------------------------------------------------------------------
    // Refresh chat details — calls service directly, updates signals
    // -------------------------------------------------------------------------

    /**
     * Patches:
     *   #17 — replace console.* with debugLog/debugError.
     *   #22 — capture chatId at call-time so a race (chatId changes mid-fetch)
     *         doesn't write detail for the wrong chat into the signal.
     */
    async refreshChatDetails(force: boolean = false): Promise<void> {
        const chatId = chatIdSignal.value;
        if (!chatId) return;
        try {
            const detail = await fetchChatDetail(chatId, force);
            // Race guard: if the active chat changed while we were fetching,
            // discard this response — a newer refresh will overwrite anyway.
            if (chatIdSignal.value !== chatId) {
                debugLog('[ChatUIBridge] refreshChatDetails: chatId changed during fetch, discarding response for', chatId);
                return;
            }
            chatDetailSignal.value = detail as unknown as ChatV2;
            lastKnownChatStatusSignal.value = detail.status as ChatStatus;
        } catch (error) {
            debugError('[ChatUIBridge] Error en refreshChatDetails:', error);
        }
    }

    async refreshChatDetailsForced(): Promise<void> {
        debugLog('[ChatUIBridge] refreshChatDetailsForced, chatId:', chatIdSignal.value);
        await this.refreshChatDetails(true);
        debugLog('[ChatUIBridge] refreshChatDetailsForced COMPLETADO');
    }

    async refreshChatDetailsFromVisitorList(visitorId: string): Promise<void> {
        const chatId = chatIdSignal.value;
        if (!chatId) return;
        try {
            const { ChatV2Service } = await import('../../services/chat-v2-service');
            const chatList = await ChatV2Service.getInstance().getVisitorChats(visitorId, undefined, VISITOR_CHAT_PAGE_SIZE);
            // Race guard (Patch #22): chatId may have changed during the await.
            if (chatIdSignal.value !== chatId) {
                debugLog('[ChatUIBridge] refreshChatDetailsFromVisitorList: chatId changed during fetch, discarding for', chatId);
                return;
            }
            const chat = chatList.chats.find((c) => c.id === chatId);
            if (!chat) {
                await this.refreshChatDetails(true);
                return;
            }
            chatDetailSignal.value = chat as unknown as ChatV2;
            lastKnownChatStatusSignal.value = chat.status as ChatStatus;
        } catch (error) {
            debugError('[ChatUIBridge] Error en refreshChatDetailsFromVisitorList:', error);
            try {
                await this.refreshChatDetails(true);
            } catch (fallback) {
                debugError('[ChatUIBridge] Fallback refreshChatDetails también falló:', fallback);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Callbacks / events — signal-based
    // -------------------------------------------------------------------------

    onOpen(callback: () => void): void {
        let prev = isVisibleSignal.peek();
        const dispose = effect(() => {
            const current = isVisibleSignal.value;
            if (current && !prev) {
                try { callback(); } catch (err) { debugError('[ChatUIBridge] onOpen callback threw:', err); }
            }
            prev = current;
        });
        this._disposers.push(dispose);
    }

    onClose(callback: () => void): void {
        let prev = isVisibleSignal.peek();
        const dispose = effect(() => {
            const current = isVisibleSignal.value;
            if (!current && prev) {
                try { callback(); } catch (err) { debugError('[ChatUIBridge] onClose callback threw:', err); }
            }
            prev = current;
        });
        this._disposers.push(dispose);
    }

    /** Patch #7: support multiple onChatInitialized subscribers. */
    onChatInitialized(callback: () => void): void {
        this._onChatInitializedCallbacks.push(callback);
    }

    private _fireChatInitialized(): void {
        this._onChatInitializedCallbacks.forEach((cb) => {
            try {
                cb();
            } catch (err) {
                debugError('[ChatUIBridge] onChatInitialized callback threw:', err);
            }
        });
    }

    /**
     * Patch #26: validate intervalMs > 0 to avoid setInterval(0) tight loops.
     */
    onActiveInterval(callback: () => void, intervalMs: number = 5000): void {
        if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
            debugWarn('[ChatUIBridge] onActiveInterval requires intervalMs > 0; got:', intervalMs);
            return;
        }
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const dispose = effect(() => {
            const visible = isVisibleSignal.value;
            if (visible && !intervalId) {
                intervalId = setInterval(callback, intervalMs);
            } else if (!visible && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        });
        this._disposers.push(() => {
            dispose();
            if (intervalId) clearInterval(intervalId);
        });
    }

    // -------------------------------------------------------------------------
    // Consent banner — PREACT (Story 2.4)
    // -------------------------------------------------------------------------

    /**
     * Mounts the GDPR consent banner in document.body (outside Shadow DOM).
     * Returns a cleanup function that unmounts and removes the element.
     * Patch #27: tracks the active banner so destroy() can clean it up.
     */
    showConsentBanner(
        config: ConsentBannerConfig,
        callbacks: {
            onAccept: () => void;
            onDeny: () => void;
            onPreferences?: () => void;
        }
    ): () => void {
        // Unmount any previously active banner first
        if (this._consentBannerDispose) {
            try { this._consentBannerDispose(); } catch (err) { debugError('[ChatUIBridge] Previous consent banner cleanup threw:', err); }
        }
        const dispose = mountConsentBanner(config, callbacks);
        this._consentBannerDispose = () => {
            dispose();
            this._consentBannerDispose = null;
        };
        return this._consentBannerDispose;
    }

    // -------------------------------------------------------------------------
    // Toggle button — delegated to ToggleBridge
    // -------------------------------------------------------------------------

    /** Renders the toggle button into the Shadow DOM */
    initToggleButton(): void { this.toggleBridge.initToggleButton(); }
    showToggleButton(): void { this.toggleBridge.showToggleButton(); }
    hideToggleButton(): void { this.toggleBridge.hideToggleButton(); }
    isButtonVisible(): boolean { return this.toggleBridge.isButtonVisible(); }
    updateToggleState(isOpen: boolean): void { this.toggleBridge.updateToggleState(isOpen); }
    notifyChatOpenState(isOpen: boolean): void { this.toggleBridge.notifyChatOpenState(isOpen); }
    updateUnreadCount(count: number | null | undefined): void { this.toggleBridge.updateUnreadCount(count); }
    hideUnreadBadge(): void { this.toggleBridge.hideUnreadBadge(); }
    onToggle(callback: (visible: boolean) => void): void { this.toggleBridge.onToggle(callback); }
    connectUnreadService(visitorId: string, onMessageReceived?: (chatId: string) => void, autoOpenChatOnMessage?: boolean): void {
        this.toggleBridge.connectUnreadService(visitorId, onMessageReceived, autoOpenChatOnMessage);
    }
    setActiveChatForUnread(chatId: string): void { this.toggleBridge.setActiveChatForUnread(chatId); }
    async markAllMessagesAsRead(): Promise<void> { return this.toggleBridge.markAllMessagesAsRead(); }
    getButtonElement(): HTMLElement | null { return this.toggleBridge.getButtonElement(); }

    // -------------------------------------------------------------------------
    // Options / position — stored from constructor
    // -------------------------------------------------------------------------

    getOptions(): ChatUIOptions { return this._options; }
    getResolvedPosition(): ResolvedPosition { return this._resolvedPosition; }
}
