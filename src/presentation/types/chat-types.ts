// chat-types.ts - Tipos e interfaces para el sistema de chat

import { ChatPositionConfig, MobileDetectionConfig, AIConfig } from "../../types";
import { AIMetadata } from "../../types/websocket-types";
import type { QuickActionsConfig } from "./quick-actions-types";
import type { ChatSelectorConfig } from "./chat-selector-types";

/**
 * Patch #23 (Chunk 2): replaced `export *` with explicit named re-exports so
 * adding a new symbol to a sub-module is an intentional publication. Same
 * rationale as Patch #8 for the signals barrel. `QuickActionsConfig` and
 * `ChatSelectorConfig` are imported at the top of this file as `type`-only
 * (used in interface bodies below) and re-exported here under the same name.
 */

// Re-export Quick Actions types
export type {
	QuickActionPayload,
	QuickAction,
	QuickActionType,
	QuickActionsConfig,
	QuickActionButton,
	InternalQuickActionsConfig,
	QuickActionSendPayload, // moved here by Patch #29
} from './quick-actions-types';

// Re-export Chat Selector types
export type {
	ChatSelectorItem,
	ChatSelectorStatus,
	ChatSelectorConfig,
	InternalChatSelectorConfig,
	ChatSelectorState,
	ChatSelectorCallbacks,
} from './chat-selector-types';
export { DEFAULT_CHAT_SELECTOR_CONFIG } from './chat-selector-types';

/**
 * Tipo para identificar el remitente de un mensaje.
 * - `'user'` / `'other'` / `'ai'` / `'agent'`: mensajes reales en la conversación.
 * - `'system'`: mensajes informativos generados por el SDK (estado, errores).
 * - `'consent'`: mensaje GDPR de consentimiento (renderizado inline por `MessageBubble`).
 */
export type Sender = 'user' | 'other' | 'system' | 'ai' | 'agent' | 'consent';

/**
 * Opciones de configuración del chat UI
 */
export interface ChatUIOptions {
	/**
	 * Theme identifier for the chat widget.
	 * Built-in options: 'default' (slate/white, classic Guiders) | 'carbon' (Vercel-style true blacks).
	 * Defaults to 'default' when omitted.
	 * @example theme: 'carbon'
	 */
	theme?: string;
	/**
	 * Color-scheme override for the chat widget.
	 * - 'dark'   — force dark mode regardless of OS preference
	 * - 'light'  — force light mode regardless of OS preference
	 * - 'system' — follow the OS preference (default, no attribute set)
	 */
	colorScheme?: 'dark' | 'light' | 'system';
	/** ID de un contenedor existente donde renderizar el chat */
	containerId?: string;
	/** Indica si se debe crear un widget nuevo en el body */
	widget?: boolean;
	/** Ancho del widget del chat */
	widgetWidth?: string;
	/** Alto del widget del chat */
	widgetHeight?: string;
	/** Color de fondo para mensajes del usuario */
	userBgColor?: string;
	/** Color de fondo para mensajes de otros usuarios */
	otherBgColor?: string;
	/** Color del texto */
	textColor?: string;
	/** Ancho máximo de los mensajes */
	maxWidthMessage?: string;
	/** Título mostrado en el header del chat cuando no hay comercial asignado (default: "Atención al usuario"). Patch #9. */
	title?: string;
	/** Configuración de posicionamiento del chat widget */
	position?: ChatPositionConfig;
	/** Configuración de detección de dispositivo móvil */
	mobileDetection?: MobileDetectionConfig;
	/** Configuración del mensaje de consentimiento del chat */
	chatConsentMessage?: Partial<ChatConsentMessageConfig>;
	/** Configuración de Quick Actions (botones de acción rápida) */
	quickActions?: Partial<QuickActionsConfig>;
	/** Configuración de IA para el chat */
	ai?: Partial<AIConfig>;
	/** Configuración del selector de chats (múltiples conversaciones) */
	chatSelector?: Partial<ChatSelectorConfig>;
	/** Configuración del banner mostrado cuando el comercial está offline. Patch #13. */
	offlineBanner?: {
		/** Texto del banner offline (default: "Agente desconectado — te responderemos en cuanto vuelva"). */
		text?: string;
	};
	/** Configuración del input de mensajes. Patch #13. */
	chatInput?: {
		/** Placeholder mostrado en el textarea (default: "Escribe un mensaje..."). */
		placeholder?: string;
	};
}

/**
 * Parámetros para renderizar un mensaje en el chat
 */
export interface ChatMessageParams {
	/** Texto del mensaje */
	text: string;
	/** Remitente del mensaje */
	sender: Sender;
	/** Timestamp de creación del mensaje en milisegundos */
	timestamp?: number;
	/** ID del remitente del mensaje */
	senderId?: string;
	/** Metadatos SYSTEM (p. ej. transferred) */
	systemData?: {
		action?: string;
		fromUserId?: string;
		toUserId?: string;
		reason?: string;
	};
	// 🤖 Campos para mensajes de IA
	/** Indica si el mensaje fue generado por IA */
	isAI?: boolean;
	/** Metadatos del modelo de IA (modelo, confianza, etc.) */
	aiMetadata?: AIMetadata;
}

/**
 * Configuración para intervalos activos del chat
 *
 * Patch #22 (Chunk 2): `id` typed as `ReturnType<typeof setInterval> | null`
 * instead of `number | null` so the type stays correct under both `dom` and
 * `@types/node` lib configurations (the latter returns `NodeJS.Timeout`).
 */
export interface ActiveInterval {
	/** Handle returned by setInterval. */
	readonly id: ReturnType<typeof setInterval> | null;
	/** Función callback a ejecutar */
	readonly callback: () => void;
	/** Intervalo en milisegundos */
	readonly intervalMs: number;
}

/**
 * Configuración del mensaje de consentimiento del chat
 * Similar al mensaje de Zara: "Al unirte al chat, confirmas que has leído..."
 */
export interface ChatConsentMessageConfig {
	/** Habilitar el mensaje de consentimiento */
	enabled: boolean;
	/** Texto del mensaje (sin incluir enlaces) */
	message: string;
	/** URL de la política de privacidad */
	privacyPolicyUrl?: string;
	/** Texto del enlace de política de privacidad */
	privacyPolicyText?: string;
	/** URL de la política de cookies */
	cookiesPolicyUrl?: string;
	/** Texto del enlace de política de cookies */
	cookiesPolicyText?: string;
	/** Mostrar solo una vez por sesión */
	showOnce?: boolean;
}