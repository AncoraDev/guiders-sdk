// quick-actions-types.ts - Tipos e interfaces para el sistema de Quick Actions

/**
 * Payload para acciones de Quick Action
 */
export interface QuickActionPayload {
	/** Mensaje a enviar al chat */
	message?: string;
	/** Metadata adicional para el backend */
	metadata?: Record<string, unknown>;
}

/**
 * All Quick-Action behaviours supported by the SDK.
 *
 * Patch #26 (Chunk 2): extracted as a named alias so consumers (and
 * `QuickActionTrackPayload` in `actionState.ts`) can import the union by name
 * instead of using `QuickAction['type']` indexed access.
 */
export type QuickActionType = 'send_message' | 'open_url' | 'request_agent' | 'custom';

/**
 * Definición de una acción de Quick Action
 */
export interface QuickAction {
	/** Tipo de acción a ejecutar */
	type: QuickActionType;
	/** Payload de la acción (string para URL/mensaje simple, objeto para datos complejos) */
	payload?: string | QuickActionPayload;
}

/**
 * Configuración de un botón de Quick Action
 */
export interface QuickActionButton {
	/** Identificador único del botón */
	id: string;
	/** Texto visible del botón */
	label: string;
	/** Emoji opcional para mostrar antes del texto */
	emoji?: string;
	/** Acción a ejecutar cuando se hace clic */
	action: QuickAction;
}

/**
 * Configuración del sistema de Quick Actions (para el usuario)
 */
export interface QuickActionsConfig {
	/** Habilitar el sistema de Quick Actions */
	enabled: boolean;
	/** Cuerpo del estado vacío del chat (bajo «Cuéntanos qué necesitas») */
	welcomeMessage?: string;
	/** Mostrar al abrir el chat por primera vez */
	showOnFirstOpen?: boolean;
	/** Mostrar al iniciar una nueva conversación */
	showOnChatStart?: boolean;
	/** Lista de botones a mostrar */
	buttons: QuickActionButton[];
	/** Callback para acciones personalizadas (type: 'custom') */
	onCustomAction?: (buttonId: string, action: QuickAction) => void;
}

/**
 * Configuración interna con todos los valores resueltos
 */
export interface InternalQuickActionsConfig {
	enabled: boolean;
	welcomeMessage: string;
	showOnFirstOpen: boolean;
	showOnChatStart: boolean;
	buttons: QuickActionButton[];
	onCustomAction?: (buttonId: string, action: QuickAction) => void;
}

/**
 * Payload emitted via `quickActionSendMessageSignal` when the visitor sends a
 * message through a Quick-Action button (action.type === 'send_message').
 *
 * Patch #29 (Chunk 2): moved here from `signals/actionState.ts` so all
 * Quick-Action types are co-located in the domain types file. The signals
 * layer should declare state, not types.
 *
 * Note: structurally similar to `QuickActionPayload` above (which has
 * `message?: string`), but this one requires `message` to be present. Future
 * consolidation opportunity — e.g. `Required<Pick<QuickActionPayload, 'message'>> & ...`.
 */
export interface QuickActionSendPayload {
	readonly message: string;
	readonly metadata?: Record<string, unknown>;
}
