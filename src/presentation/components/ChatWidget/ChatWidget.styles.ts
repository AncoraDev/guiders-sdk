import { ResolvedPosition } from '../../../utils/position-resolver';
import { TOGGLE_BUTTON_CSS } from '../ToggleButton/ToggleButton.styles';
import { getPresenceIndicatorStyles } from '../PresenceIndicator/PresenceIndicator.styles';

/**
 * Generates the full CSS string for the ChatWidget Shadow DOM.
 * Migrated from ChatUI.getChatStyles() + ChatSelectorUI.getStyles().
 */
export function getChatStyles(position: ResolvedPosition): string {
    const widgetPos = position.widget;
    const positionCSS = `
        ${widgetPos.top ? `top: ${widgetPos.top};` : ''}
        ${widgetPos.bottom ? `bottom: ${widgetPos.bottom};` : ''}
        ${widgetPos.left ? `left: ${widgetPos.left};` : ''}
        ${widgetPos.right ? `right: ${widgetPos.right};` : ''}
    `.trim();

    return `
        @property --deg {
            syntax: '<angle>';
            inherits: false;
            initial-value: 0deg;
        }

        @keyframes rotate-gradient {
            from { --deg: 0deg; }
            to   { --deg: 360deg; }
        }

        :host { all: initial; font-family: var(--gds-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif); }

        .guiders-chat-widget-root {
            display: contents;
        }

        .guiders-chat-widget-root.hidden {
            display: none;
        }

        .chat-widget {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid var(--gds-widget-border-color, transparent);
            border-radius: var(--widget-radius, var(--gds-radius-lg, 16px));
            overflow: hidden;
            background: var(--gds-color-bg);
            font-family: var(--gds-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif);
            display: flex;
            flex-direction: column;
            /* Positioning context for the floating composer (.chat-input-container). */
            position: relative;
            transition: box-shadow var(--gds-duration-slow, 200ms) var(--gds-ease-out, cubic-bezier(0.16,1,0.3,1));
        }

        .chat-widget-fixed {
            width: var(--widget-width, 400px);
            height: var(--widget-height, 600px);
            position: fixed;
            bottom: var(--widget-bottom, ${widgetPos.bottom ?? '24px'});
            right: var(--widget-right, ${widgetPos.right ?? '24px'});
            ${widgetPos.top ? `top: ${widgetPos.top};` : ''}
            ${widgetPos.left ? `left: ${widgetPos.left};` : ''}
            transition: all var(--gds-duration-slow, 200ms) var(--gds-ease-out, cubic-bezier(0.16,1,0.3,1));
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
        }

        /* Mobile bottom sheet */
        @media (max-width: 640px) {
            .chat-widget-fixed {
                width: 100%;
                height: min(85vh, 640px);
                top: auto;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 20px 20px 0 0;
            }
            .chat-widget {
                border-radius: 20px 20px 0 0;
            }
        }

        /* Drag handle (mobile only) */
        .chat-drag-handle {
            display: none;
            /* Transparent hit area — tall enough to grab easily */
            width: 100%;
            height: 20px;
            margin: 4px 0 0 0;
            flex-shrink: 0;
            cursor: grab;
            touch-action: none;
            position: relative;
        }
        /* Subtle pill rendered via pseudo-element so the background
           of the parent stays transparent (no ugly grey rectangle). */
        .chat-drag-handle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 32px;
            height: 3px;
            border-radius: 999px;
            background: var(--gds-color-border);
            opacity: 0.6;
            transition: opacity 150ms ease, width 150ms ease;
        }
        .chat-drag-handle:active {
            cursor: grabbing;
        }
        .chat-drag-handle:active::before {
            opacity: 1;
            width: 40px;
        }
        @media (max-width: 640px) {
            .chat-drag-handle { display: block; }
        }

        /* Mobile overlay */
        .chat-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(2px);
            z-index: 2147483646;
        }

        @keyframes aurora-shift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .chat-header {
            color: var(--gds-color-header-text, #ffffff);
            padding: 12px 8px 12px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-top-left-radius: var(--gds-radius-lg, 16px);
            border-top-right-radius: var(--gds-radius-lg, 16px);
            min-height: 56px;
            height: auto;
            flex-shrink: 0;
            background: var(--gds-color-header-bg, #111827);
            border-bottom: 1px solid var(--gds-header-border-color, transparent);
            box-sizing: border-box;
        }

        .chat-header--no-agents {
            align-items: flex-start;
            padding-top: 14px;
            padding-bottom: 14px;
        }

        .chat-header--no-agents .chat-header-actions {
            padding-top: 2px;
        }

        .chat-header-subtitle {
            font-size: 11.5px;
            font-weight: 400;
            line-height: 1.35;
            letter-spacing: 0.01em;
            color: rgba(255, 255, 255, 0.72);
            color: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 72%, transparent);
            white-space: normal;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            max-width: 100%;
        }

        @media (max-width: 640px) {
            .chat-header {
                border-top-left-radius: 20px;
                border-top-right-radius: 20px;
            }
        }

        /* back btn + identity (avatar+title+badge) fill available space */
        .chat-header-main {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }

        /* identity = avatar + title/badge side by side */
        .chat-header-identity {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            flex: 1;
        }

        .chat-header-avatar-container {
            position: relative;
            flex-shrink: 0;
        }

        .chat-header-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            background: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 8%, transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border: 1px solid color-mix(in srgb, var(--gds-color-header-text, #ffffff) 15%, transparent);
        }

        .chat-header-avatar svg {
            width: 18px;
            height: 18px;
            color: rgba(255, 255, 255, 0.9);
            color: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 90%, transparent);
        }

        .avatar-status-dot {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 1.5px solid #ffffff;
            transition: all var(--gds-duration-slow, 200ms) var(--gds-ease-out, ease);
        }

        .avatar-status-dot.status-online {
            background-color: #10b981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .avatar-status-dot.status-offline {
            background-color: #6b7280;
        }

        .avatar-status-dot.status-away {
            background-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }

        .avatar-status-dot.status-busy {
            background-color: #ef4444;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }

        .avatar-status-dot.status-chatting {
            background-color: #60a5fa;
            box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }

        .chat-header-title-container {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
            min-width: 0;
        }

        .chat-header-title {
            font-weight: 600;
            font-size: 15px;
            letter-spacing: -0.01em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--gds-color-header-text, #ffffff);
            line-height: 1.2;
        }

        .chat-header-actions {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .chat-close-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            color: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 80%, transparent);
            cursor: pointer;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all var(--gds-duration-normal, 150ms) ease;
            border-radius: 50%;
        }

        .chat-close-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            background: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 15%, transparent);
            color: var(--gds-color-header-text, #ffffff);
        }

        .chat-close-btn:active {
            transform: scale(0.95);
        }

        .chat-close-btn svg {
            width: 18px;
            height: 18px;
        }

        @media (max-width: 768px) {
            .chat-close-btn {
                width: 36px;
                height: 36px;
            }

            .chat-close-btn svg {
                width: 22px;
                height: 22px;
            }
        }

        .chat-back-btn {
            background: rgba(255, 255, 255, 0.15);
            background: color-mix(in srgb, var(--gds-color-header-text, #ffffff) 15%, transparent);
            border: none;
            color: var(--gds-color-header-text, #ffffff);
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all var(--gds-duration-normal, 150ms) ease;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .chat-back-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .chat-back-btn:active {
            transform: scale(0.95);
            background: rgba(255, 255, 255, 0.4);
        }

        .chat-back-btn svg {
            width: 20px;
            height: 20px;
        }

        @media (max-width: 768px) {
            .chat-back-btn {
                width: 36px;
                height: 36px;
            }

            .chat-back-btn svg {
                width: 22px;
                height: 22px;
            }
        }

        .guiders-chat-list-view-wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
        }

         .chat-messages {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow-y: auto;
            /* Bottom padding leaves clear space for the floating composer. */
            padding: 18px 16px 96px 16px;
            background: var(--gds-color-bg);
            scroll-behavior: smooth;
            /* Fade messages out as they approach the floating composer so they
               dissolve at the mid-point of the input instead of hard-clipping.
               The transparent zone covers ~56px from the bottom (≈ half the
               composer height), then fades over 32px into the visible area. */
            -webkit-mask-image: linear-gradient(
                to bottom,
                black calc(100% - 88px),
                transparent calc(100% - 32px)
            );
            mask-image: linear-gradient(
                to bottom,
                black calc(100% - 88px),
                transparent calc(100% - 32px)
            );
        }

        .chat-message-wrapper {
            position: relative;
            margin-bottom: 16px;
            max-width: 75%;
            display: flex;
            flex-direction: column;
        }

        .chat-message {
            padding: 10px 14px;
            border-radius: 18px;
            white-space: normal;
            overflow-wrap: break-word;
            word-wrap: break-word;
            line-height: 1.4;
            font-size: 14px;
            position: relative;
        }

        .chat-message-user-wrapper {
            display: flex;
            align-self: flex-end;
        }

        .chat-message-user {
            background: var(--gds-color-primary);
            color: var(--gds-color-text-on-primary);
            border-bottom-right-radius: 4px;
        }

        .chat-message-other-wrapper {
            align-self: flex-start;
            display: flex;
            gap: 8px;
        }

        .chat-message-other {
            background: var(--gds-color-bg-elevated);
            color: var(--gds-color-text);
            border-bottom-left-radius: 4px;
        }

        .chat-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: var(--gds-color-bg-elevated);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .chat-message-time {
            font-size: 11px;
            color: var(--gds-color-text-tertiary);
            margin-top: 4px;
            opacity: 0.85;
        }

        .chat-input-container {
            flex-shrink: 0;
            position: absolute;
            left: 0;
            right: 0;
            bottom: 12px;
            margin: 0 12px;
            border-radius: 22px;
            padding: 0;
            box-sizing: border-box;
            z-index: 2;
            background: var(--gds-color-bg-elevated, #1f2937);
            border: 1px solid color-mix(in srgb, var(--gds-color-primary, #3b82f6) 28%, transparent);
            box-shadow:
                0 8px 28px rgba(0, 0, 0, 0.28),
                0 0 0 1px rgba(255, 255, 255, 0.04) inset;
            transition:
                border-color 160ms ease,
                box-shadow 160ms ease;
        }

        .chat-input-container:focus-within {
            border-color: color-mix(in srgb, var(--gds-color-primary, #3b82f6) 55%, transparent);
            box-shadow:
                0 10px 32px rgba(0, 0, 0, 0.32),
                0 0 0 3px color-mix(in srgb, var(--gds-color-primary, #3b82f6) 18%, transparent);
        }

        .chat-input-container--ready {
            border-color: color-mix(in srgb, var(--gds-color-primary, #3b82f6) 45%, transparent);
        }

        .chat-input-inner {
            position: relative;
            z-index: 1;
            background: transparent;
            border-radius: 22px;
            padding: 8px 8px 8px 16px;
            box-sizing: border-box;
        }

        .chat-input-wrapper {
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            gap: 10px;
            width: 100%;
        }

        @media (max-width: 768px) {
            .chat-input-container {
                margin: 0 10px;
                bottom: 10px;
            }
        }

        .chat-input-field {
            -webkit-flex: 1;
            flex: 1;
            border: none;
            padding: 10px 0;
            font-size: var(--gds-font-size-md, 15px);
            font-family: var(--gds-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif);
            outline: none;
            background: transparent;
            color: var(--gds-color-text);
            min-width: 0;
            box-sizing: border-box;
            resize: none;
            overflow: hidden;
            line-height: 1.45;
            max-height: 100px;
            min-height: 22px;
        }

        .chat-input-field:focus {
            background: transparent;
        }

        .chat-input-field::placeholder {
            color: var(--gds-color-text-tertiary, #9ca3af);
            opacity: 0.9;
        }

        .chat-send-btn {
            background: color-mix(in srgb, var(--gds-color-primary, #3b82f6) 28%, transparent);
            color: var(--gds-color-text-tertiary, #9ca3af);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: default;
            display: -webkit-flex;
            display: flex;
            -webkit-align-items: center;
            align-items: center;
            -webkit-justify-content: center;
            justify-content: center;
            transition:
                background 150ms ease,
                color 150ms ease,
                transform 150ms ease,
                opacity 150ms ease;
            -webkit-flex-shrink: 0;
            flex-shrink: 0;
            box-sizing: border-box;
            opacity: 0.7;
        }

        .chat-send-btn svg {
            display: block;
            width: 18px;
            height: 18px;
        }

        .chat-send-btn--active {
            background: var(--gds-color-primary, #3b82f6);
            color: var(--gds-color-text-on-primary, #ffffff);
            cursor: pointer;
            opacity: 1;
        }

        .chat-send-btn--active:hover {
            background: var(--gds-color-primary-hover, var(--gds-color-primary, #2563eb));
            transform: scale(1.04);
        }

        .chat-send-btn--active:active {
            -webkit-transform: scale(0.96);
            transform: scale(0.96);
        }

        /* Presence Indicator */
        .guiders-presence-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .guiders-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
            transition: all var(--gds-duration-slow, 200ms) var(--gds-ease-out, ease);
            border: 2px solid white;
        }

        .guiders-status-online {
            background-color: #10b981;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .guiders-status-offline {
            background-color: #6b7280;
            box-shadow: none;
        }

        .guiders-status-busy {
            background-color: #ef4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .guiders-status-away {
            background-color: #f59e0b;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }

        .guiders-status-chatting {
            background-color: #60a5fa;
            box-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
        }

        .guiders-status-text {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.95);
            letter-spacing: 0.02em;
            text-transform: capitalize;
        }

        .guiders-status-changing {
            animation: statusPulse var(--gds-duration-slow, 200ms) ease;
        }

        @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        /* Offline Banner */
        .guiders-offline-banner {
            background: var(--gds-color-bg-elevated);
            color: var(--gds-color-text-secondary);
            padding: 6px 16px;
            text-align: center;
            font-size: var(--gds-font-size-sm, 13px);
            border-bottom: 1px solid var(--gds-color-border);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            user-select: none;
        }

        /* Typing Indicator */
        .guiders-typing-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px 8px;
            opacity: 0;
            transition: opacity var(--gds-duration-normal, 150ms) ease;
        }

        .guiders-typing-bubble {
            background: var(--gds-color-bg-elevated);
            border: 1px solid var(--gds-color-border);
            border-radius: var(--gds-radius-bubble, 14px);
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .guiders-typing-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            animation: gdsBounce 1.2s infinite ease-in-out;
        }

        .guiders-typing-dot:nth-child(1) { animation-delay: 0s; }
        .guiders-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .guiders-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes gdsBounce {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-4px); opacity: 1; }
        }

        .guiders-typing-text {
            font-size: var(--gds-font-size-xs, 11px);
            color: var(--gds-color-text-secondary);
            font-style: italic;
        }

        /* Consent Message */
        .chat-consent-message-wrapper {
            align-self: center;
            max-width: 90%;
            margin: 16px auto 20px auto;
        }

        .chat-consent-message {
            background: var(--gds-color-bg-elevated);
            border: 1px solid var(--gds-color-border);
            border-radius: 12px;
            padding: 14px 18px;
            text-align: center;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        }

        .chat-consent-message-content {
            font-size: 12px;
            line-height: 1.5;
            color: var(--gds-color-text-secondary);
        }

        .chat-consent-link {
            color: var(--gds-color-primary);
            text-decoration: none;
            font-weight: 500;
            transition: color var(--gds-duration-normal, 150ms) ease, text-decoration var(--gds-duration-normal, 150ms) ease;
        }

        .chat-consent-link:hover {
            color: var(--gds-color-primary-hover, var(--gds-color-primary));
            text-decoration: underline;
        }

        .chat-consent-link:active {
            opacity: 0.8;
        }

        @media (max-width: 768px) {
            .chat-consent-message-wrapper {
                max-width: 95%;
                margin: 12px auto 16px auto;
            }

            .chat-consent-message {
                padding: 12px 14px;
            }

            .chat-consent-message-content {
                font-size: 11px;
            }
        }

        /* Quick Actions */
        .guiders-quick-actions {
            display: flex;
            flex-direction: column;
            padding: 12px 16px;
            margin: 0;
            background: transparent;
            position: sticky;
            bottom: 0;
            transition: opacity var(--gds-duration-slow, 200ms) ease, transform var(--gds-duration-slow, 200ms) ease;
        }

        .guiders-quick-actions-welcome {
            padding: 12px 16px;
            background: var(--gds-color-bg-elevated);
            border-radius: 12px;
            margin-bottom: 12px;
            color: var(--gds-color-text);
            font-size: 14px;
            line-height: 1.5;
            text-align: center;
        }

        .guiders-quick-actions-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
        }

        .guiders-quick-action-btn {
            padding: 10px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--gds-duration-normal, 150ms) ease;
            white-space: nowrap;
            font-family: inherit;
            background: var(--gds-color-bg);
            color: var(--gds-color-text);
            border: 1.5px solid var(--gds-color-border);
        }

        .guiders-quick-action-btn:hover {
            background: var(--gds-color-bg-elevated);
            border-color: var(--gds-color-border-strong);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .guiders-quick-action-btn:active {
            transform: translateY(0);
            background: var(--gds-color-bg-elevated);
        }

        .guiders-quick-action-btn:focus {
            outline: none;
            border-color: var(--gds-color-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        /* request_agent button — violet border only, neutral text */
        .guiders-quick-action-btn--agent {
            border-color: var(--gds-color-agent-btn-border);
        }

        .guiders-quick-action-btn--agent:hover {
            background: var(--gds-color-author-ai-soft);
            border-color: var(--gds-color-agent-btn-border);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
        }

        .guiders-quick-action-btn--agent:active {
            transform: translateY(0);
            background: var(--gds-color-author-ai-soft);
        }

        @media (max-width: 768px) {
            .guiders-quick-actions {
                margin: 0;
                padding: 8px 12px;
            }

            .guiders-quick-actions-buttons {
                flex-wrap: nowrap;
                overflow-x: auto;
                justify-content: flex-start;
                padding-bottom: 8px;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }

            .guiders-quick-actions-buttons::-webkit-scrollbar {
                display: none;
            }

            .guiders-quick-action-btn {
                flex-shrink: 0;
            }
        }

        /* Chat Selector */
        .guiders-chat-selector {
            position: relative;
            display: inline-flex;
            align-items: center;
        }

        .guiders-chat-selector-trigger {
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
            margin-left: 4px;
        }

        .guiders-chat-selector-trigger:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .guiders-chat-selector-arrow {
            font-size: 10px;
            color: inherit;
            opacity: 0.7;
            transition: transform 0.2s ease;
        }

        .guiders-chat-selector-trigger.open .guiders-chat-selector-arrow {
            transform: rotate(180deg);
        }

        .guiders-chat-selector-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            min-width: 250px;
            max-width: 300px;
            max-height: 350px;
            overflow-y: auto;
            background: var(--gds-color-bg);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            margin-top: 8px;
        }

        .guiders-chat-selector-loading,
        .guiders-chat-selector-error,
        .guiders-chat-selector-empty {
            padding: 16px;
            text-align: center;
            color: var(--gds-color-text-secondary);
            font-size: 14px;
        }

        .guiders-chat-selector-error {
            color: var(--gds-color-error);
        }

        .guiders-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--gds-color-border);
            border-top-color: var(--gds-color-text);
            border-radius: 50%;
            animation: guiders-spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }

        @keyframes guiders-spin {
            to { transform: rotate(360deg); }
        }

        .guiders-chat-selector-new-chat {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 12px 16px;
            background: transparent;
            border: none;
            cursor: pointer;
            text-align: left;
            font-size: 14px;
            color: var(--gds-color-primary);
            transition: background-color 0.2s ease;
        }

        .guiders-chat-selector-new-chat:hover {
            background-color: var(--gds-color-bg-elevated);
        }

        .guiders-chat-selector-new-emoji {
            font-size: 16px;
            margin-right: 8px;
        }

        .guiders-chat-selector-separator {
            height: 1px;
            background: var(--gds-color-border);
            margin: 4px 0;
        }

        .guiders-chat-selector-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 12px 16px;
            background: transparent;
            border: none;
            cursor: pointer;
            text-align: left;
            transition: background-color 0.2s ease;
        }

        .guiders-chat-selector-item:hover {
            background-color: var(--gds-color-bg-elevated);
        }

        .guiders-chat-selector-item.selected {
            background-color: var(--gds-color-primary-soft);
        }

        .guiders-chat-selector-item-content {
            flex: 1;
            overflow: hidden;
        }

        .guiders-chat-selector-item-title {
            display: block;
            font-size: 14px;
            color: var(--gds-color-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .guiders-chat-selector-item-date {
            display: block;
            font-size: 12px;
            color: var(--gds-color-text-tertiary);
            margin-top: 2px;
        }

        .guiders-chat-selector-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            background: var(--gds-color-error);
            color: white;
            font-size: 11px;
            font-weight: bold;
            border-radius: 10px;
            margin-left: 8px;
        }

        /* Chat List View */
        .guiders-chat-list-view {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            width: 100%;
            background: var(--gds-color-bg);
            font-family: var(--gds-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif);
            box-sizing: border-box;
        }

        .guiders-chat-list-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 12px;
            border-bottom: 1px solid var(--gds-color-border);
            min-height: 56px;
            background: var(--gds-color-bg);
            gap: 8px;
        }

        .guiders-chat-list-back-btn {
            background: none;
            border: none;
            padding: 8px;
            cursor: pointer;
            color: var(--gds-color-text);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .guiders-chat-list-back-btn:hover {
            background: var(--gds-color-bg-elevated);
        }

        .guiders-chat-list-title {
            margin: 0;
            font-size: 17px;
            font-weight: 600;
            color: var(--gds-color-text);
            flex: 1;
            text-align: left;
        }

        .guiders-chat-list-close-btn {
            background: none;
            border: none;
            padding: 8px;
            cursor: pointer;
            color: var(--gds-color-text-secondary);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .guiders-chat-list-close-btn:hover {
            background: var(--gds-color-bg-elevated);
            color: var(--gds-color-text);
        }

        .guiders-chat-list-container {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .guiders-chat-list-container > button {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            box-sizing: border-box;
        }

        .guiders-chat-list-loading,
        .guiders-chat-list-error,
        .guiders-chat-list-empty {
            padding: 24px;
            text-align: center;
            color: var(--gds-color-text-secondary);
            font-size: 14px;
        }

        .guiders-chat-list-error {
            color: var(--gds-color-error);
        }

        .guiders-chat-list-new-chat {
            display: flex !important;
            align-items: center;
            gap: 12px;
            width: 100% !important;
            min-width: 100% !important;
            padding: 16px 20px;
            border: none !important;
            border-bottom: 1px solid var(--gds-color-border) !important;
            border-radius: 0 !important;
            background: var(--gds-color-bg-elevated);
            cursor: pointer;
            text-align: left;
            transition: background 0.2s;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .guiders-chat-list-new-chat:hover {
            background: var(--gds-color-bg-sunken);
        }

        .guiders-chat-list-new-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--gds-color-text);
            color: var(--gds-color-bg);
            flex-shrink: 0;
        }

        .guiders-chat-list-new-text {
            font-size: 15px;
            font-weight: 500;
            color: var(--gds-color-text);
        }

        .guiders-chat-list-item {
            display: flex !important;
            align-items: center;
            gap: 12px;
            width: 100% !important;
            min-width: 100% !important;
            padding: 14px 20px;
            border: none !important;
            border-bottom: 1px solid var(--gds-color-border-subtle) !important;
            border-radius: 0 !important;
            background: var(--gds-color-bg);
            cursor: pointer;
            text-align: left;
            transition: background 0.2s;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .guiders-chat-list-item:hover {
            background: var(--gds-color-bg-elevated);
        }

        .guiders-chat-list-item.selected {
            background: var(--gds-color-primary-soft);
        }

        .guiders-chat-list-avatar {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--gds-color-bg-elevated);
            color: var(--gds-color-text-secondary);
            flex-shrink: 0;
        }

        .guiders-chat-list-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }

        /* Presence dot overlaid on the chat-list avatar (commercial status) */
        .guiders-chat-list-presence {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            border: 2px solid var(--gds-color-bg-elevated, #ffffff);
            box-sizing: content-box;
            pointer-events: none;
        }
        .guiders-chat-list-presence--online  { background: #10b981; }
        .guiders-chat-list-presence--away    { background: #f59e0b; }
        .guiders-chat-list-presence--busy    { background: #ef4444; }
        .guiders-chat-list-presence--offline { background: #9ca3af; }

        /* Subtle pulse for online state */
        .guiders-chat-list-presence--online {
            animation: gds-presence-pulse 2.5s ease-in-out infinite;
        }

        .guiders-chat-list-content {
            flex: 1;
            min-width: 0;
        }

        .guiders-chat-list-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 4px;
        }

        .guiders-chat-list-item-title {
            font-size: 15px;
            font-weight: 500;
            color: var(--gds-color-text);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .guiders-chat-list-item-time {
            font-size: 12px;
            color: var(--gds-color-text-tertiary);
            flex-shrink: 0;
        }

        .guiders-chat-list-preview-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .guiders-chat-list-preview {
            font-size: 13px;
            color: var(--gds-color-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .guiders-chat-list-badge {
            background: var(--gds-color-error);
            color: var(--gds-color-text-on-primary);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
            flex-shrink: 0;
        }

        ${TOGGLE_BUTTON_CSS(position)}

        /* ── Presence dot (injected from PresenceIndicator.styles.ts) ── */
        ${getPresenceIndicatorStyles()}

        /* ── Presence dot: pulse animation when online ── */
        @keyframes gds-presence-pulse {
            0%, 100% { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25); }
            50%       { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.10); }
        }
        .guiders-presence--online {
            animation: gds-presence-pulse 2.5s ease-in-out infinite;
        }

        /* ── Presence dot positioning inside avatar container ── */
        .chat-header-avatar-container {
            position: relative;
        }
        .guiders-presence {
            position: absolute;
            bottom: 1px;
            right: 1px;
            width: 10px;
            height: 10px;
            border: 2px solid var(--gds-color-header-bg, #5b21b6);
            border-radius: 50%;
        }

        /* ── Presence status text below the agent name ── */
        .chat-header-presence-text {
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.01em;
            line-height: 1.2;
            opacity: 0.85;
            transition: color 0.3s ease;
        }
        .chat-header-presence-text--online  { color: #6ee7b7; }
        .chat-header-presence-text--away    { color: #fcd34d; }
        .chat-header-presence-text--busy    { color: #fca5a5; }
        .chat-header-presence-text--offline { color: rgba(255,255,255,0.55); }
    `;
}
