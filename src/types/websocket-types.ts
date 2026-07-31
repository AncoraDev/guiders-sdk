/**
 * Tipos para el sistema de WebSocket bidireccional en tiempo real
 * Basado en la documentación del backend: websocket-real-time-chat.md
 */

/**
 * Tipos de mensajes soportados
 */
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'ai';

/**
 * Metadatos de mensajes generados por IA
 */
export interface AIMetadata {
	/** Modelo de IA utilizado (ej: 'gpt-4', 'claude-3', 'llama-3.3-70b-versatile') */
	model?: string;
	/** Nivel de confianza de la respuesta (0-1) */
	confidence?: number;
	/** Acciones sugeridas basadas en la conversación */
	suggestedActions?: string[];
	/** Tiempo de procesamiento en milisegundos */
	processingTimeMs?: number;
	/** Contexto adicional del procesamiento de IA */
	context?: {
		provider?: string;
		triggerMessageId?: string;
		tokensUsed?: number;
	};
}

/**
 * Estados posibles del chat
 */
export type ChatStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/**
 * Estructura de un mensaje recibido via WebSocket (evento message:new)
 */
export interface RealtimeMessage {
	messageId: string;        // UUID del mensaje
	chatId: string;           // UUID del chat
	content: string;          // Contenido del mensaje
	type: MessageType;        // Tipo de mensaje
	senderId: string;         // UUID del emisor
	senderName: string;       // Nombre del emisor
	senderType?: 'VISITOR' | 'COMMERCIAL' | 'SYSTEM' | string;
	sentAt: string;           // ISO 8601 timestamp
	isInternal?: boolean;     // Solo para comerciales
	systemData?: {
		action?: string;
		fromUserId?: string;
		toUserId?: string;
		reason?: string;
	};
	attachment?: {
		url: string;
		fileName: string;
		fileSize: number;
		mimeType: string;
	};
	// 🤖 Campos para mensajes de IA
	isAI?: boolean;           // true si es respuesta generada por IA
	aiMetadata?: AIMetadata;  // Metadatos del modelo de IA
}

/**
 * Estructura de cambio de estado del chat (evento chat:status)
 */
export interface ChatStatusUpdate {
	chatId: string;
	status: ChatStatus;
	timestamp: string;        // ISO 8601
}

/**
 * Evento de typing indicator (cuando alguien está escribiendo)
 */
export interface TypingIndicator {
	chatId: string;
	userId: string;
	userName: string;
	isTyping: boolean;
}

/**
 * Configuración del servicio WebSocket
 */
export interface WebSocketConfig {
	/** URL del servidor WebSocket */
	url: string;
	/** Path del socket (default: /socket.io/) */
	path?: string;
	/** Token JWT para autenticación (comerciales) */
	authToken?: string;
	/** Cookie de sesión (visitantes) */
	sessionId?: string;
	/** ID del tenant para autenticación */
	tenantId?: string;
	/** Transports a usar */
	transports?: ('websocket' | 'polling')[];
	/** Enviar credenciales (cookies) */
	withCredentials?: boolean;
	/** Reconexión automática */
	reconnection?: boolean;
	/** Intentos de reconexión */
	reconnectionAttempts?: number;
	/** Delay entre reintentos (ms) */
	reconnectionDelay?: number;
}

/**
 * Estados de conexión del WebSocket
 */
export enum WebSocketState {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	RECONNECTING = 'reconnecting',
	ERROR = 'error'
}

/**
 * Callbacks para eventos de WebSocket
 */
export interface WebSocketCallbacks {
	/** Callback cuando se conecta */
	onConnect?: () => void;
	/** Callback cuando se desconecta */
	onDisconnect?: (reason: string) => void;
	/** Callback cuando hay error */
	onError?: (error: Error) => void;
	/** Callback cuando llega un mensaje nuevo */
	onMessage?: (message: RealtimeMessage) => void;
	/** Callback cuando cambia el estado del chat */
	onChatStatus?: (status: ChatStatusUpdate) => void;
	/** Callback cuando alguien está escribiendo (legacy) */
	onTyping?: (typing: TypingIndicator) => void;
	/** Callback cuando un comercial crea un chat proactivamente */
	onChatCreated?: (event: ChatCreatedEvent) => void;
	/** Callback cuando un comercial es asignado al chat */
	onCommercialAssigned?: (event: CommercialAssignedEvent) => void;
	/** Callback cuando alguien comienza a escribir (presencia V2) */
	onTypingStart?: (event: import('../types/presence-types').TypingEvent) => void;
	/** Callback cuando alguien deja de escribir (presencia V2) */
	onTypingStop?: (event: import('../types/presence-types').TypingEvent) => void;
	/** Callback cuando cambia el estado de presencia de un usuario */
	onPresenceChanged?: (event: import('../types/presence-types').PresenceChangedEvent) => void;
	/** Callback cuando se confirma la unión a una sala personal (🆕 2025: auto-join automático) */
	onPresenceJoined?: (event: import('../types/presence-types').PresenceJoinedEvent) => void;
	// 🤖 Callbacks para IA
	/** Callback cuando la IA comienza a generar una respuesta */
	onAITypingStart?: (data: { chatId: string }) => void;
	/** Callback cuando la IA termina de generar una respuesta */
	onAITypingStop?: (data: { chatId: string }) => void;
	/** Callback cuando cambia la disponibilidad de comerciales en tiempo real */
	onCommercialAvailabilityChanged?: (event: CommercialAvailabilityChangedEvent) => void;
}

/**
 * Payload para unirse a una sala de chat
 */
export interface JoinChatRoomPayload {
	chatId: string;
}

/**
 * Payload para salir de una sala de chat
 */
export interface LeaveChatRoomPayload {
	chatId: string;
}

/**
 * Payload para emitir typing indicator
 */
export interface TypingPayload {
	chatId: string;
	isTyping: boolean;
}

/**
 * Payload para unirse a sala de visitante
 */
export interface JoinVisitorRoomPayload {
	visitorId: string;
}

/**
 * Payload para salir de sala de visitante
 */
export interface LeaveVisitorRoomPayload {
	visitorId: string;
}

/**
 * Respuesta del servidor al unirse a sala de visitante
 */
export interface VisitorRoomJoinedResponse {
	visitorId: string;
	roomName: string;
	timestamp: string;
}

/**
 * Prioridades del chat
 */
export type ChatPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Evento cuando un comercial crea un chat proactivamente
 */
export interface ChatCreatedEvent {
	chatId: string;
	visitorId: string;
	status: ChatStatus;
	priority: ChatPriority;
	visitorInfo?: {
		name?: string;
		email?: string;
		phone?: string;
	};
	metadata?: Record<string, any>;
	createdAt: string;
	message: string;
}

/**
 * Información del comercial asignado
 */
export interface AssignedCommercialInfo {
	id: string;
	name: string;
	avatarUrl?: string;
}

/**
 * Evento cuando un comercial es asignado a un chat (chat:commercial-assigned)
 */
export interface CommercialAssignedEvent {
	chatId: string;
	commercialId: string;
	visitorId: string;
	status: string;           // nuevo estado del chat
	assignedAt: string;       // timestamp ISO
	assignmentReason: string; // 'auto' | 'manual'
	commercial?: AssignedCommercialInfo; // información del comercial
}

/**
 * Evento de cambio de disponibilidad de comerciales (commercial:availability-changed)
 */
export interface CommercialAvailabilityChangedEvent {
	/** true si al menos un comercial está online para este tenant */
	available: boolean;
	/** Número de comerciales online */
	onlineCount: number;
	/** UUID de la empresa (para verificación) */
	tenantId: string;
	/** ISO 8601 timestamp del evento */
	timestamp: string;
}
