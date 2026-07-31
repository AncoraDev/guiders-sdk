import { EndpointManager } from '../core/endpoint-manager';
import { debugLog, debugWarn, debugError } from '../utils/debug-logger';
import { ChatV2, ChatListV2, CreateChatResponse } from '../types';
import { getCommonHeaders, getCommonFetchOptions } from '../utils/http-headers';

/**
 * Servicio para interactuar con la API V2 de chats
 * Proporciona métodos optimizados para las operaciones de chat
 */
export class ChatV2Service {
	private static instance: ChatV2Service;

	private constructor() {
		debugLog('[ChatV2Service] 🚀 Constructor llamado');
	}

	public static getInstance(): ChatV2Service {
		if (!ChatV2Service.instance) {
			ChatV2Service.instance = new ChatV2Service();
		}
		return ChatV2Service.instance;
	}

	/**
	 * Obtiene los headers de autorización para las peticiones
	 */
	private getAuthHeaders(): Record<string, string> {
		return getCommonHeaders();
	}

	/**
	 * Obtiene las opciones de fetch con autenticación adecuada
	 */
	private getFetchOptions(method: string = 'GET', body?: string): RequestInit {
		const options = getCommonFetchOptions(method);
		if (body) {
			options.body = body;
		}
		return options;
	}

	/**
	 * Ejecuta una petición fetch con manejo automático de errores 401
	 * Si recibe 401, intenta re-autenticar y reintentar la petición
	 */
	private async fetchWithReauth(url: string, options: RequestInit): Promise<Response> {
		let response = await fetch(url, options);

		if (response.status === 401) {
			debugLog('[ChatV2Service] ⚠️ Error 401 - Intentando re-autenticación...');

			// Intentar re-autenticar
			const reauthed = await this.reAuthenticate();
			if (reauthed) {
				debugLog('[ChatV2Service] ✅ Re-autenticación exitosa, reintentando petición...');
				// Reintentar la petición con las nuevas credenciales
				response = await fetch(url, {
					...options,
					headers: this.getAuthHeaders()
				});
			} else {
				debugLog('[ChatV2Service] ❌ Re-autenticación fallida');
			}
		}

		return response;
	}

	/**
	 * Intenta re-autenticar al visitante
	 */
	public async reAuthenticate(): Promise<boolean> {
		try {
			const visitorId = localStorage.getItem('visitorId');
			const fingerprint = localStorage.getItem('fingerprint');
			const apiKey = localStorage.getItem('guidersApiKey') || localStorage.getItem('apiKey');
			const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
			const currentUrl = typeof window !== 'undefined' ? window.location.href : undefined;

			// Obtener consentVersion del localStorage
			let consentVersion = 'v1.0';
			const consentStateStr = localStorage.getItem('guiders_consent_state');
			if (consentStateStr) {
				try {
					const consentState = JSON.parse(consentStateStr);
					consentVersion = consentState.version || 'v1.0';
				} catch (e) {
					// Ignorar error de parseo
				}
			}

			debugLog('[ChatV2Service] 🔐 reAuthenticate() llamado');
			debugLog('  - visitorId:', visitorId);
			debugLog('  - fingerprint:', fingerprint ? fingerprint.substring(0, 20) + '...' : 'null');
			debugLog('  - apiKey:', apiKey);
			debugLog('  - domain:', domain);

			if (!visitorId || !fingerprint) {
				debugLog('[ChatV2Service] ❌ No hay visitorId o fingerprint para re-autenticar');
				return false;
			}

			const endpoints = EndpointManager.getInstance();
			const baseEndpoint = (localStorage.getItem('pixelEndpoint') || endpoints.getEndpoint());
			const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
			const identifyUrl = `${apiRoot}/visitors/identify`;

			debugLog('[ChatV2Service] 📤 POST', identifyUrl);

			const response = await fetch(identifyUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...this.getAuthHeaders()
				},
				body: JSON.stringify({
					fingerprint,
					domain,
					apiKey: apiKey || '',
					hasAcceptedPrivacyPolicy: true,
					consentVersion,
					currentUrl
				})
			});

			debugLog('[ChatV2Service] 📥 Response status:', response.status);

			if (response.ok) {
				const data = await response.json();
				debugLog('[ChatV2Service] 📦 Respuesta identify:', JSON.stringify(data, null, 2));

				if (data.sessionId) {
					const oldSessionId = sessionStorage.getItem('guiders_backend_session_id');
					sessionStorage.setItem('guiders_backend_session_id', data.sessionId);
					debugLog('[ChatV2Service] ✅ SessionId actualizado:', oldSessionId, '→', data.sessionId);
				} else {
					debugWarn('[ChatV2Service] ⚠️ No hay sessionId en la respuesta');
				}

				if (data.visitorId) {
					localStorage.setItem('visitorId', data.visitorId);
				}

				if (data.tenantId || data.tenant_id) {
					localStorage.setItem('tenantId', data.tenantId || data.tenant_id);
					debugLog('[ChatV2Service] ✅ TenantId guardado:', data.tenantId || data.tenant_id);
				}

				debugLog('[ChatV2Service] ✅ Re-identificación completada');
				return true;
			}

			const errorText = await response.text();
			debugError('[ChatV2Service] ❌ Error en re-identificación:', response.status, errorText);
			return false;
		} catch (error) {
			debugError('[ChatV2Service] ❌ Error en re-autenticación:', error);
			return false;
		}
	}

	/**
	 * Obtiene la URL base para la API V2
	 */
	private getBaseUrl(): string {
		const endpoints = EndpointManager.getInstance();
		const baseEndpoint = (localStorage.getItem('pixelEndpoint') || endpoints.getEndpoint());
		// Asegurar que /api no se duplique
		const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
		return `${apiRoot}/v2/chats`;
	}


	/**
	 * Obtiene los chats de un visitante específico
	 * @param visitorId ID del visitante
	 * @param cursor Cursor para paginación (opcional)
	 * @param limit Límite de resultados (opcional, default: 20)
	 * @returns Promise con la lista de chats del visitante
	 */
	async getVisitorChats(visitorId: string, cursor?: string, limit: number = 20): Promise<ChatListV2> {
		debugLog(`[ChatV2Service] 👤 Obteniendo chats del visitante: ${visitorId}`);

		const params = new URLSearchParams();
		if (cursor) params.append('cursor', cursor);
		params.append('limit', limit.toString());

		const baseEndpoint = (localStorage.getItem('pixelEndpoint') || EndpointManager.getInstance().getEndpoint());
		const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
		const url = `${apiRoot}/v2/visitors/${visitorId}/chats?${params.toString()}`;

		const response = await this.fetchWithReauth(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al obtener chats del visitante ${visitorId}:`, errorText);
			throw new Error(`Error al obtener chats del visitante (${response.status}): ${errorText}`);
		}

		const chatList = await response.json() as ChatListV2;
		debugLog(`[ChatV2Service] ✅ Chats del visitante obtenidos:`, {
			count: chatList.chats.length,
			total: chatList.total,
			hasMore: chatList.hasMore
		});

		return chatList;
	}

	/**
	 * Obtiene el chat más reciente de un visitante.
	 * Nota: El endpoint GET /api/v2/chats/visitor/{visitorId}/my-chat requiere autenticación de comercial
	 * y no es accesible desde el contexto de visitante (x-guiders-sid). Se usa getVisitorChats con limit=1
	 * que sí acepta sesión de visitante (GET /api/v2/visitors/{visitorId}/chats).
	 */
	async getLatestVisitorChat(visitorId: string): Promise<ChatV2 | null> {
		try {
			const list = await this.getVisitorChats(visitorId, undefined, 1);
			if (list.chats && list.chats.length > 0) return list.chats[0];
			return null;
		} catch (e) {
			debugWarn('[ChatV2Service] ❌ Error obteniendo último chat del visitante:', e);
			return null;
		}
	}

	/**
	 * Obtiene los chats de un comercial específico
	 * @param commercialId ID del comercial
	 * @param cursor Cursor para paginación (opcional)
	 * @param limit Límite de resultados (opcional, default: 20)
	 * @param filters Filtros adicionales (opcional)
	 * @returns Promise con la lista de chats del comercial
	 */
	async getCommercialChats(
		commercialId: string,
		cursor?: string,
		limit: number = 20,
		filters?: Record<string, any>
	): Promise<ChatListV2> {
		debugLog(`[ChatV2Service] 🏪 Obteniendo chats del comercial: ${commercialId}`);

		const params = new URLSearchParams();
		if (cursor) params.append('cursor', cursor);
		params.append('limit', limit.toString());
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					value.forEach(v => params.append(`filters[${key}][]`, v));
				} else {
					params.append(`filters[${key}]`, value);
				}
			});
		}

		const baseEndpoint = (localStorage.getItem('pixelEndpoint') || EndpointManager.getInstance().getEndpoint());
		const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
		const url = `${apiRoot}/v2/commercials/${commercialId}/chats?${params.toString()}`;

		const response = await fetch(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al obtener chats del comercial ${commercialId}:`, errorText);
			throw new Error(`Error al obtener chats del comercial (${response.status}): ${errorText}`);
		}

		const chatList = await response.json() as ChatListV2;
		debugLog(`[ChatV2Service] ✅ Chats del comercial obtenidos:`, {
			count: chatList.chats.length,
			total: chatList.total,
			hasMore: chatList.hasMore
		});

		return chatList;
	}

	/**
	 * Obtiene la cola de chats pendientes
	 * @param department Departamento específico (opcional)
	 * @param limit Límite de resultados (opcional, default: 50)
	 * @returns Promise con la lista de chats pendientes
	 */
	async getPendingQueue(department?: string, limit: number = 50): Promise<ChatV2[]> {
		debugLog(`[ChatV2Service] 📋 Obteniendo cola de chats pendientes`);

		const params = new URLSearchParams();
		if (department) params.append('department', department);
		params.append('limit', limit.toString());

		const url = `${this.getBaseUrl()}/queue/pending?${params.toString()}`;

		const response = await fetch(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al obtener cola pendiente:`, errorText);
			throw new Error(`Error al obtener cola pendiente (${response.status}): ${errorText}`);
		}

		const chats = await response.json() as ChatV2[];
		debugLog(`[ChatV2Service] ✅ Cola de chats pendientes obtenida:`, {
			count: chats.length
		});

		return chats;
	}

	/**
	 * Asigna un chat a un comercial
	 * @param chatId ID del chat
	 * @param commercialId ID del comercial
	 * @returns Promise con el chat actualizado
	 */
	async assignChat(chatId: string, commercialId: string): Promise<ChatV2> {
		debugLog(`[ChatV2Service] 📌 Asignando chat ${chatId} al comercial ${commercialId}`);

		const response = await fetch(`${this.getBaseUrl()}/${chatId}/assign/${commercialId}`, this.getFetchOptions('PUT'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al asignar chat:`, errorText);
			throw new Error(`Error al asignar chat (${response.status}): ${errorText}`);
		}

		const chat = await response.json() as ChatV2;
		debugLog(`[ChatV2Service] ✅ Chat asignado exitosamente`);

		return chat;
	}

	/**
	 * Abre un chat (notifica al backend que el visitante está viendo el chat)
	 *
	 * NOTA: Este endpoint es OPCIONAL. Si el backend no lo tiene implementado,
	 * el chat seguirá funcionando normalmente (solo no se sincronizará el estado).
	 *
	 * @param chatId ID del chat
	 * @returns Promise con el chat actualizado, o null si el endpoint no está disponible
	 */
	async openChat(chatId: string): Promise<ChatV2 | null> {
		debugLog(`[ChatV2Service] 🔓 Abriendo chat ${chatId}`);

		try {
			const response = await fetch(`${this.getBaseUrl()}/${chatId}/view-open`, this.getFetchOptions('PUT'));

			// Si el endpoint no existe (404) o no está implementado (501), es opcional
			if (response.status === 404 || response.status === 501) {
				debugWarn(`[ChatV2Service] ⚠️ Endpoint /view-open no disponible (${response.status}) - continuando sin sincronizar estado`);
				return null;
			}

			if (!response.ok) {
				const errorText = await response.text();
				debugError(`[ChatV2Service] ❌ Error al abrir chat:`, errorText);
				throw new Error(`Error al abrir chat (${response.status}): ${errorText}`);
			}

			const chat = await response.json() as ChatV2;
			debugLog(`[ChatV2Service] ✅ Chat abierto exitosamente`);

			return chat;
		} catch (error) {
			// Si es error de red o endpoint no existe, no es crítico
			if (error instanceof TypeError) {
				debugWarn(`[ChatV2Service] ⚠️ No se pudo conectar al endpoint /view-open - continuando sin sincronizar estado`);
				return null;
			}
			// Re-lanzar otros errores
			throw error;
		}
	}

	/**
	 * Cierra un chat (notifica al backend que el visitante cerró el chat)
	 *
	 * NOTA: Este endpoint es OPCIONAL. Si el backend no lo tiene implementado,
	 * el chat seguirá funcionando normalmente (solo no se sincronizará el estado).
	 *
	 * @param chatId ID del chat
	 * @returns Promise con el chat actualizado, o null si el endpoint no está disponible
	 */
	async closeChat(chatId: string): Promise<ChatV2 | null> {
		debugLog(`[ChatV2Service] 🔒 Cerrando chat ${chatId}`);

		try {
			const response = await fetch(`${this.getBaseUrl()}/${chatId}/view-close`, this.getFetchOptions('PUT'));

			// Si el endpoint no existe (404) o no está implementado (501), es opcional
			if (response.status === 404 || response.status === 501) {
				debugWarn(`[ChatV2Service] ⚠️ Endpoint /view-close no disponible (${response.status}) - continuando sin sincronizar estado`);
				return null;
			}

			if (!response.ok) {
				const errorText = await response.text();
				debugError(`[ChatV2Service] ❌ Error al cerrar chat:`, errorText);
				throw new Error(`Error al cerrar chat (${response.status}): ${errorText}`);
			}

			const chat = await response.json() as ChatV2;
			debugLog(`[ChatV2Service] ✅ Chat cerrado exitosamente`);

			return chat;
		} catch (error) {
			// Si es error de red o endpoint no existe, no es crítico
			if (error instanceof TypeError) {
				debugWarn(`[ChatV2Service] ⚠️ No se pudo conectar al endpoint /view-close - continuando sin sincronizar estado`);
				return null;
			}
			// Re-lanzar otros errores
			throw error;
		}
	}

	/**
	 * Obtiene métricas de un comercial
	 * @param commercialId ID del comercial
	 * @param dateFrom Fecha de inicio (opcional)
	 * @param dateTo Fecha de fin (opcional)
	 * @returns Promise con las métricas del comercial
	 */
	async getCommercialMetrics(
		commercialId: string,
		dateFrom?: Date,
		dateTo?: Date
	): Promise<any> {
		debugLog(`[ChatV2Service] 📊 Obteniendo métricas del comercial: ${commercialId}`);

		const params = new URLSearchParams();
		if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
		if (dateTo) params.append('dateTo', dateTo.toISOString());

		const url = `${this.getBaseUrl()}/metrics/commercial/${commercialId}?${params.toString()}`;

		const response = await fetch(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al obtener métricas:`, errorText);
			throw new Error(`Error al obtener métricas (${response.status}): ${errorText}`);
		}

		const metrics = await response.json();
		debugLog(`[ChatV2Service] ✅ Métricas obtenidas`);

		return metrics;
	}

	/**
	 * Obtiene estadísticas de tiempo de respuesta
	 * @param dateFrom Fecha de inicio (opcional)
	 * @param dateTo Fecha de fin (opcional)
	 * @param groupBy Agrupación de datos (opcional)
	 * @returns Promise con las estadísticas
	 */
	async getResponseTimeStats(
		dateFrom?: Date,
		dateTo?: Date,
		groupBy: 'hour' | 'day' | 'week' = 'day'
	): Promise<any[]> {
		debugLog(`[ChatV2Service] ⏱️ Obteniendo estadísticas de tiempo de respuesta`);

		const params = new URLSearchParams();
		if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
		if (dateTo) params.append('dateTo', dateTo.toISOString());
		params.append('groupBy', groupBy);

		const url = `${this.getBaseUrl()}/response-time-stats?${params.toString()}`;

		const response = await fetch(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError(`[ChatV2Service] ❌ Error al obtener estadísticas:`, errorText);
			throw new Error(`Error al obtener estadísticas (${response.status}): ${errorText}`);
		}

		const stats = await response.json();
		debugLog(`[ChatV2Service] ✅ Estadísticas obtenidas`);

		return stats;
	}

	/**
	 * Crea un chat V2 usando POST /v2/chats (ID generado por el backend).
	 * Usado también tras identify (site-entry) para colocar al visitante en Pendientes
	 * sin mensaje inicial (`metadata.source: 'sdk-site-entry'`).
	 * @param payload Datos del chat
	 * @returns Promise con { chatId, position } — ID del chat creado y posición en la cola de espera
	 */
	async createChatAuto(payload: any): Promise<CreateChatResponse> {
		debugLog('[ChatV2Service] 🆕 Creando chat V2 por POST (auto-id)');
		const response = await this.fetchWithReauth(`${this.getBaseUrl()}`, this.getFetchOptions('POST', JSON.stringify(payload)));
		if (!response.ok) {
			const errorText = await response.text();
			debugError('[ChatV2Service] ❌ Error al crear chat V2 (POST):', errorText);
			throw new Error(`Error al crear chat V2 (POST) (${response.status}): ${errorText}`);
		}
		const result = await response.json() as CreateChatResponse;
		debugLog('[ChatV2Service] ✅ Chat V2 creado (POST):', result.chatId, '— posición en cola:', result.position);
		return result;
	}

	/**
	 * Crea un chat V2 con mensaje inicial usando el endpoint POST /v2/chats/with-message
	 * Esta operación es atómica: crea el chat y envía el primer mensaje juntos
	 * @param chatData Datos del chat (department, priority, subject, etc.)
	 * @param messageData Datos del primer mensaje (content, type)
	 * @returns Promise con la respuesta de la API: { chatId, messageId, position }
	 */
	async createChatWithMessage(chatData: any, messageData: any): Promise<{ chatId: string; messageId: string; position: number }> {
		debugLog('[ChatV2Service] 🆕💬 Creando chat V2 con mensaje inicial');
		
		// Estructura corregida según la API real: firstMessage en lugar de message
		const payload = {
			...chatData, // Los datos del chat van directamente en el root
			firstMessage: messageData // El mensaje va como firstMessage
		};

		debugLog('[ChatV2Service] 📤 Payload enviado:', JSON.stringify(payload, null, 2));

		const response = await this.fetchWithReauth(`${this.getBaseUrl()}/with-message`, this.getFetchOptions('POST', JSON.stringify(payload)));

		if (!response.ok) {
			const errorText = await response.text();
			debugError('[ChatV2Service] ❌ Error al crear chat V2 con mensaje:', errorText);
			throw new Error(`Error al crear chat V2 con mensaje (${response.status}): ${errorText}`);
		}

		const result = await response.json();
		debugLog('[ChatV2Service] ✅ Chat V2 con mensaje creado:', result.chat?.chatId || result.chat?.id);
		
		return result;
	}

	/**
	 * Envía un mensaje a un chat existente usando POST /v2/messages
	 * @param chatId ID del chat al que enviar el mensaje
	 * @param content Contenido del mensaje
	 * @param type Tipo de mensaje (text, image, file, etc.)
	 * @returns Promise con el mensaje enviado
	 */
	async sendMessage(chatId: string, content: string, type: string = 'text'): Promise<any> {
		debugLog(`[ChatV2Service] 💬 Enviando mensaje al chat ${chatId}`);
		
		const payload = {
			chatId,
			content,
			type
		};

		// Construir URL para el endpoint de mensajes
		const endpoints = EndpointManager.getInstance();
		const baseEndpoint = (localStorage.getItem('pixelEndpoint') || endpoints.getEndpoint());
		const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
		const messagesUrl = `${apiRoot}/v2/messages`;

		const response = await this.fetchWithReauth(messagesUrl, this.getFetchOptions('POST', JSON.stringify(payload)));

		if (!response.ok) {
			const errorText = await response.text();
			debugError('[ChatV2Service] ❌ Error al enviar mensaje:', errorText);
			throw new Error(`Error al enviar mensaje (${response.status}): ${errorText}`);
		}

		const message = await response.json();
		debugLog('[ChatV2Service] ✅ Mensaje enviado:', message.messageId || message.id);
		
		return message;
	}

	/**
	 * Método inteligente que decide si crear un chat nuevo con mensaje o enviar mensaje a chat existente
	 * @param visitorId ID del visitante
	 * @param content Contenido del mensaje
	 * @param chatData Datos del chat (solo se usa si se crea uno nuevo)
	 * @param messageType Tipo de mensaje (default: TEXT)
	 * @param forceNewChat Si es true, siempre crea un chat nuevo (ignora chats existentes)
	 * @returns Promise con el resultado de la operación
	 */
	async sendMessageSmart(
		visitorId: string,
		content: string,
		chatData: any = {},
		messageType: string = 'text',
		forceNewChat: boolean = false
	): Promise<{ chat: { id: string }; message: { id: string }; isNewChat: boolean }> {
		debugLog(`[ChatV2Service] 🧠 Enviando mensaje inteligente para visitante ${visitorId}`, { forceNewChat });

		try {
			// Si forceNewChat es true, siempre crear un chat nuevo
			if (forceNewChat) {
				debugLog(`[ChatV2Service] 🆕 Forzando creación de chat nuevo con mensaje`);

				const messageData = { content, type: messageType };
				const result = await this.createChatWithMessage(chatData, messageData);

				return {
					chat: { id: result.chatId },
					message: { id: result.messageId },
					isNewChat: true
				};
			}

			// Comportamiento por defecto: buscar chats existentes
			const chatList = await this.getVisitorChats(visitorId, undefined, 1);

			if (chatList.chats && chatList.chats.length > 0) {
				// Existe al menos un chat, usar el primero (más reciente) y enviar mensaje
				const existingChat = chatList.chats[0];
				debugLog(`[ChatV2Service] 📋 Chat existente encontrado: ${existingChat.id}, enviando mensaje`);

				const message = await this.sendMessage(existingChat.id, content, messageType);

				return {
					chat: { id: existingChat.id },
					message: { id: message.messageId || message.id },
					isNewChat: false
				};
			} else {
				// No hay chats existentes, crear uno nuevo con el mensaje
				debugLog(`[ChatV2Service] 🆕 No hay chats existentes, creando chat nuevo con mensaje`);

				const messageData = { content, type: messageType };
				const result = await this.createChatWithMessage(chatData, messageData);

				return {
					chat: { id: result.chatId }, // Crear objeto chat con el ID recibido
					message: { id: result.messageId }, // Crear objeto message con el ID recibido
					isNewChat: true
				};
			}
		} catch (error) {
			debugError('[ChatV2Service] ❌ Error en sendMessageSmart:', error);
			throw error;
		}
	}

	/**
	 * Obtiene los mensajes de un chat específico con paginación
	 * @param chatId ID del chat
	 * @param limit Límite de mensajes (default: 50)
	 * @param cursor Cursor para paginación (opcional)
	 * @returns Promise con la lista de mensajes
	 */
	async getChatMessages(
		chatId: string,
		limit: number = 50,
		cursor?: string
	): Promise<any> {
		debugLog(`[ChatV2Service] 📋 Obteniendo mensajes del chat: ${chatId}`);

		const params = new URLSearchParams();
		params.append('limit', limit.toString());
		if (cursor) params.append('cursor', cursor);

		// Construir URL para el endpoint de mensajes
		const endpoints = EndpointManager.getInstance();
		const baseEndpoint = (localStorage.getItem('pixelEndpoint') || endpoints.getEndpoint());
		const apiRoot = baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
		const url = `${apiRoot}/v2/messages/chat/${chatId}?${params.toString()}`;

		const response = await this.fetchWithReauth(url, this.getFetchOptions('GET'));

		if (!response.ok) {
			const errorText = await response.text();
			debugError('[ChatV2Service] ❌ Error al obtener mensajes del chat:', errorText);
			throw new Error(`Error al obtener mensajes del chat (${response.status}): ${errorText}`);
		}

		const messageList = await response.json();
		
		// 🔧 Mapear nextCursor a cursor para compatibilidad con scroll infinito
		if (messageList.nextCursor && !messageList.cursor) {
			messageList.cursor = messageList.nextCursor;
		}
		
		debugLog(`[ChatV2Service] ✅ Mensajes del chat obtenidos:`, {
			count: messageList.messages?.length || 0,
			total: messageList.total,
			hasMore: messageList.hasMore,
			cursor: messageList.cursor
		});

		return messageList;
	}
}
