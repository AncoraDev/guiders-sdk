import { h, render } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { effect } from '@preact/signals-core';
import { ChatUIOptions, QuickActionsConfig } from '../../types/chat-types';
import { ResolvedPosition } from '../../../utils/position-resolver';
import { isVisibleSignal, isShowingChatListSignal } from '../../signals';
import {
    toggleResolvedPositionSignal,
    toggleClickedSignal,
    toggleChatOpenSignal,
} from '../../signals/toggleState';
import { getChatStyles } from './ChatWidget.styles';
import { getTokensCSS } from '../../styles/tokens.styles';
import { resolveTheme } from '../../styles/themes/index';
import { ChatHeader } from '../ChatHeader';
import { ChatMessages } from '../ChatMessages';
import { ChatInput } from '../ChatInput';
import { OfflineBanner } from '../OfflineBanner';
import { QuickActions } from '../QuickActions';
import { ChatListView } from '../ChatListView';
import { ToggleButton } from '../ToggleButton';
import { usePresence } from '../../hooks/usePresence';
import { useCommercialPresenceWebSocket } from '../../hooks/useCommercialPresenceMap';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChatWidgetOptions extends ChatUIOptions {}

interface ChatWidgetProps {
    options: ChatWidgetOptions;
    position: ResolvedPosition;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveQuickActionsConfig(options: ChatWidgetOptions): QuickActionsConfig {
    return {
        enabled: false,
        welcomeMessage: '¡Hola! 👋 ¿En qué puedo ayudarte?',
        showOnFirstOpen: true,
        showOnChatStart: true,
        buttons: [],
        ...options.quickActions,
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ChatWidget — Story 6.7:
 *   - bottom sheet layout mobile (<640px)
 *   - drag handle + tap-to-close overlay on mobile
 *   - focus trap (Tab cycling) when panel is open
 *   - role="dialog" aria-modal="true"
 */
export function ChatWidget({ options }: ChatWidgetProps) {
    const visible = isVisibleSignal.value;
    const isShowingList = isShowingChatListSignal.value;
    const quickActionsConfig = resolveQuickActionsConfig(options);

    // Subscribe to PresenceService updates
    usePresence();

    // Subscribe to commercial presence WS updates at the WIDGET ROOT so events
    // are not lost while the chat list view is hidden. Mounting this in
    // ChatListView would lose updates received while the user is in a chat
    // (or with the widget closed).
    useCommercialPresenceWebSocket();

    // Patch #23: when the widget is hidden, mark its subtree as `inert` so
    // screen readers and Tab navigation skip it entirely.
    // Patch #24: when the chat closes, return focus to the element that had
    // focus before it was opened (typically the ToggleButton).
    const widgetRootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const lastFocusedBeforeOpenRef = useRef<HTMLElement | null>(null);
    // Initialize to !visible so that opening on mount always triggers the focus-save branch
    const wasVisibleRef = useRef<boolean>(!visible);

    // Story 6.7: drag-to-close (mobile) — real-time panel follow with snap-back/close
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const dragStartYRef = useRef<number>(0);
    const dragStartXRef = useRef<number>(0);
    const isDraggingRef = useRef<boolean>(false);

    const handleClose = () => {
        if (toggleChatOpenSignal.peek()) {
            toggleClickedSignal.value = toggleClickedSignal.peek() + 1;
        }
    };

    // Use imperative addEventListener so we can pass { passive: false } on
    // touchmove — required to call e.preventDefault() and prevent the browser
    // from hijacking the gesture for page scroll.
    useEffect(() => {
        const handle = dragHandleRef.current;
        const panel  = panelRef.current;
        if (!handle || !panel) return;

        const onStart = (e: TouchEvent) => {
            dragStartYRef.current  = e.touches[0].clientY;
            dragStartXRef.current  = e.touches[0].clientX;
            isDraggingRef.current  = true;
            panel.style.transition = 'none';
        };

        const onMove = (e: TouchEvent) => {
            if (!isDraggingRef.current) return;
            const deltaY = e.touches[0].clientY - dragStartYRef.current;
            const deltaX = Math.abs(e.touches[0].clientX - dragStartXRef.current);
            if (deltaY <= 0 || deltaX > deltaY) return;
            e.preventDefault(); // prevent page scroll while dragging the handle
            panel.style.transform = `translateY(${deltaY}px)`;
        };

        const onEnd = (e: TouchEvent) => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            const touch    = e.changedTouches[0];
            const deltaY   = touch.clientY - dragStartYRef.current;
            const deltaX   = Math.abs(touch.clientX - dragStartXRef.current);
            const panelH   = panel.offsetHeight || 600;
            const shouldClose = deltaY > panelH * 0.3 && deltaX <= deltaY;

            if (shouldClose) {
                // Slide out cleanly downward — no opacity change.
                panel.style.transition = 'transform 300ms cubic-bezier(0.4,0,1,1)';
                panel.style.transform  = `translateY(${panelH}px)`;
                setTimeout(() => {
                    panel.style.transition = '';
                    panel.style.transform  = '';
                    handleClose();
                }, 300);
            } else {
                // Spring snap back.
                panel.style.transition = 'transform 420ms cubic-bezier(0.16,1,0.3,1)';
                panel.style.transform  = '';
                setTimeout(() => { panel.style.transition = ''; }, 420);
            }
        };

        handle.addEventListener('touchstart', onStart, { passive: true });
        handle.addEventListener('touchmove',  onMove,  { passive: false });
        handle.addEventListener('touchend',   onEnd,   { passive: true });

        return () => {
            handle.removeEventListener('touchstart', onStart);
            handle.removeEventListener('touchmove',  onMove);
            handle.removeEventListener('touchend',   onEnd);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // useLayoutEffect ensures `inert` is set before the browser paints,
    // preventing the "dialog announced before inert" race (patch F-M4).
    useLayoutEffect(() => {
        const wasVisible = wasVisibleRef.current;
        wasVisibleRef.current = visible;

        const root = widgetRootRef.current;
        if (root) {
            if (visible) {
                root.removeAttribute('inert');
            } else {
                root.setAttribute('inert', '');
            }
        }

        if (visible && !wasVisible) {
            lastFocusedBeforeOpenRef.current =
                (document.activeElement as HTMLElement | null) ?? null;
        } else if (!visible && wasVisible) {
            const target = lastFocusedBeforeOpenRef.current;
            // Patch F-H3: document.contains() returns false for Shadow DOM nodes.
            // Use getRootNode({ composed: true }) to walk the composed tree.
            const isInDOM = (el: HTMLElement) =>
                document.contains(el) || el.getRootNode({ composed: true }) === document;
            if (target && isInDOM(target) && typeof target.focus === 'function') {
                queueMicrotask(() => {
                    try { target.focus(); } catch { /* ignore */ }
                });
            }
            lastFocusedBeforeOpenRef.current = null;
        }
    }, [visible]);

    // Story 6.7: Focus trap — Tab cycling inside the panel (AC: 9)
    useEffect(() => {
        if (!visible) return undefined;

        const trapFocus = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const panel = panelRef.current;
            if (!panel) return;
            const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
                'button,[href],input,textarea,[tabindex]:not([tabindex="-1"])'
            )).filter(el => !el.hasAttribute('disabled'));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const shadowRoot = panel.getRootNode() as ShadowRoot | Document;
            const active = shadowRoot.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', trapFocus);
        return () => document.removeEventListener('keydown', trapFocus);
    }, [visible]);

    // Patch F-M1: isMobile must be reactive to window resize (not evaluated once at render)
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= 640
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return (
        <>
        <ToggleButton />
        {/* Mobile overlay: tap-to-close backdrop */}
        {visible && isMobile && (
            <div
                class="chat-overlay"
                onClick={handleClose}
                aria-hidden="true"
            />
        )}
        <div
            ref={widgetRootRef}
            class={`guiders-chat-widget-root${visible ? '' : ' hidden'}`}
        >
            <div
                ref={panelRef}
                class="chat-widget chat-widget-fixed"
                role="dialog"
                aria-modal="true"
                aria-label="Chat de soporte"
            >
                {/* Drag handle — listeners attached imperatively in useEffect
                    with { passive: false } so touchmove can call preventDefault
                    and prevent browser scroll hijack during the drag gesture. */}
                <div
                    ref={dragHandleRef}
                    class="chat-drag-handle"
                    aria-hidden="true"
                />
                <ChatHeader options={options} />
                <OfflineBanner />
                {isShowingList
                    ? <ChatListView />
                    : (
                        <>
                            <ChatMessages />
                            {quickActionsConfig.enabled && quickActionsConfig.buttons.length > 0 && (
                                <QuickActions config={quickActionsConfig} />
                            )}
                            <ChatInput />
                        </>
                    )
                }
            </div>
        </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

export interface MountedChatWidget {
    /** The shadow-host element appended to document.body. */
    host: HTMLElement;
    /**
     * Cleans up: disposes the style-update effect, unmounts Preact and removes
     * the shadow host. Patch #5 — previously the effect leaked across mounts.
     */
    dispose: () => void;
}

/**
 * Creates a Shadow Host on document.body, attaches a Shadow Root,
 * injects CSS and renders <ChatWidget /> with Preact.
 * Patch #5 — returns a `{ host, dispose }` pair so callers can clean up
 * the style-update effect (previously leaked) and the rendered tree.
 */
/**
 * Returns true when a CSS hex color is light (luminance > 50%).
 * Used to decide whether to mark the shadow host with data-header-light.
 * Only handles hex colors (#rgb, #rrggbb); unknown formats return false.
 */
function isLightColor(hex: string): boolean {
    const clean = hex.trim().replace('#', '');
    let r: number, g: number, b: number;
    if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
        r = parseInt(clean.slice(0, 2), 16);
        g = parseInt(clean.slice(2, 4), 16);
        b = parseInt(clean.slice(4, 6), 16);
    } else {
        return false;
    }
    // Perceived luminance formula (sRGB)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

export function mountChatWidget(
    options: ChatWidgetOptions,
    position: ResolvedPosition
): MountedChatWidget {
    // Guard: if a host already exists and has a shadow root, return a no-op
    // dispose to prevent double mounts caused by SDK re-init on consent grant.
    const existing = document.getElementById('guiders-chat-widget');
    if (existing?.shadowRoot) {
        return {
            host: existing as HTMLElement,
            dispose: () => { /* already mounted — no-op */ },
        };
    }

    const shadowHost = document.createElement('div');
    shadowHost.id = 'guiders-chat-widget';

    const resolvedTheme = resolveTheme(options.theme);

    // Apply color-scheme override if explicitly set (not 'system' / undefined).
    // The CSS in tokens.styles.ts uses :host([data-color-scheme="dark|light"]) to
    // force the active color palette regardless of OS prefers-color-scheme.
    if (options.colorScheme && options.colorScheme !== 'system') {
        shadowHost.setAttribute('data-color-scheme', options.colorScheme);
    }

    // Mark the host when the light-mode header background is a light/white color.
    // Used by badge selectors in ChatWidget.styles.ts to avoid applying dark-badge
    // styles over a light header when the OS is dark but no color-scheme is forced
    // (e.g. carbon theme light header + OS dark mode).
    const lightHeaderBg = resolvedTheme?.light?.colorHeaderBg ?? '';
    if (isLightColor(lightHeaderBg)) {
        shadowHost.setAttribute('data-header-light', '');
    }

    document.body.appendChild(shadowHost);

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = getTokensCSS(resolvedTheme) + getChatStyles(position);
    shadowRoot.appendChild(styleEl);

    // Re-generate styles when toggle position changes (e.g. after bridge updates position)
    const disposeStyleEffect = effect(() => {
        const updatedPosition = toggleResolvedPositionSignal.value ?? position;
        styleEl.textContent = getTokensCSS(resolvedTheme) + getChatStyles(updatedPosition);
    });

    const mountPoint = document.createElement('div');
    shadowRoot.appendChild(mountPoint);

    render(h(ChatWidget, { options, position }), mountPoint);

    let disposed = false;
    const dispose = (): void => {
        if (disposed) return;
        disposed = true;
        try { disposeStyleEffect(); } catch { /* ignore */ }
        try { render(null, mountPoint); } catch { /* ignore */ }
        if (shadowHost.parentNode) shadowHost.parentNode.removeChild(shadowHost);
    };

    return { host: shadowHost, dispose };
}
