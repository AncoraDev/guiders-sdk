/**
 * 📡 Commercial Availability Service
 *
 * Checks commercial availability via REST on init, then subscribes to
 * real-time updates via WebSocket (commercial:availability-changed).
 *
 * Flow:
 *   1. POST /v2/commercials/availability → initial state + siteId
 *   2. WebSocketService.joinTenantRoom(tenantId) → subscribe to live updates
 *   3. Listen commercial:availability-changed → update UI
 */

import { debugLog, debugWarn, debugError } from '../utils/debug-logger';
import { WebSocketService } from './websocket-service';

export interface CommercialAvailabilityConfig {
	/** Domain of the website */
	domain: string;
	/** API Key for the site */
	apiKey: string;
	/** Base URL of the API */
	apiBaseUrl?: string;
	/** Enable debug logging */
	debug?: boolean;
	/** tenantId (companyId) — if known, skips REST lookup for WS join */
	tenantId?: string;
}

export interface AvailabilityResponse {
	/** Whether any commercial is available */
	available: boolean;
	/** Number of online commercials */
	onlineCount: number;
	/** Timestamp of the response */
	timestamp: string;
	/** UUID of the resolved site */
	siteId: string;
	/** companyId — room WS = tenant:{tenantId} */
	tenantId?: string;
}

export interface AvailabilityError {
	error: string;
	status: number;
	timestamp: string;
}

/**
 * Service to check and track commercial availability.
 * Uses REST for the initial check and WebSocket for real-time updates.
 */
export class CommercialAvailabilityService {
	private config: CommercialAvailabilityConfig;
	private onAvailabilityChangeCallback: ((available: boolean, count: number) => void) | null = null;
	private lastAvailability: boolean | null = null;
	private lastOnlineCount: number = 0;
	private tenantId: string | null = null;
	private wsListenerRegistered: boolean = false;

	constructor(config: CommercialAvailabilityConfig) {
		this.config = {
			debug: false,
			...config
		};

		if (config.tenantId) {
			this.tenantId = config.tenantId;
		}

		this.log('📡 [CommercialAvailability] Servicio inicializado', {
			domain: this.config.domain,
			hasTenantId: !!this.tenantId
		});
	}

	/**
	 * Registers callback invoked on every availability change.
	 */
	onAvailabilityChanged(callback: (available: boolean, count: number) => void): void {
		this.onAvailabilityChangeCallback = callback;
		this.log('📡 [CommercialAvailability] Callback registrado');
	}

	/**
	 * Performs the initial REST check and registers the WebSocket listener.
	 * Safe to call multiple times — only acts once per instance.
	 */
	async start(): Promise<AvailabilityResponse | null> {
		const result = await this.checkAvailability();
		this.registerWebSocketListener();
		return result;
	}

	/**
	 * Performs a single REST availability check.
	 * Notifies the callback if the state changed.
	 */
	async checkAvailability(): Promise<AvailabilityResponse | null> {
		const endpoint = `${this.config.apiBaseUrl || ''}/v2/commercials/availability`;

		try {
			this.log('📡 [CommercialAvailability] Consultando disponibilidad...', endpoint);

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					domain: this.config.domain,
					apiKey: this.config.apiKey
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			const data: AvailabilityResponse = await response.json();
			this.log('📡 [CommercialAvailability] Respuesta recibida:', data);

			// Prefer companyId (tenantId) for WS room tenant:{companyId} — never siteId
			if (data.tenantId) {
				this.tenantId = data.tenantId;
				try {
					localStorage.setItem('tenantId', data.tenantId);
				} catch {
					/* ignore */
				}
				this.log('📡 [CommercialAvailability] tenantId (companyId) para WS:', data.tenantId);
			} else if (!this.tenantId) {
				debugWarn(
					'📡 [CommercialAvailability] ⚠️ Sin tenantId en respuesta; WS join diferido'
				);
			}

			this.notify(data.available, data.onlineCount);

			// Re-join if we just learned the correct tenant room
			if (this.tenantId && this.wsListenerRegistered) {
				WebSocketService.getInstance().joinTenantRoom(this.tenantId);
			}

			return data;
		} catch (error) {
			debugError('📡 [CommercialAvailability] ❌ Error al consultar disponibilidad:', error);
			return null;
		}
	}

	/**
	 * Registers the WebSocket listener for commercial:availability-changed.
	 * Also joins the tenant room and re-joins on reconnection.
	 * Idempotent — only registers once per instance.
	 */
	registerWebSocketListener(): void {
		if (this.wsListenerRegistered) return;
		this.wsListenerRegistered = true;

		const ws = WebSocketService.getInstance();

		// Register the real-time callback
		ws.updateCallbacks({
			onCommercialAvailabilityChanged: (event) => {
				this.log('📡 [CommercialAvailability] WS event recibido:', event);
				this.notify(event.available, event.onlineCount);
			},
			// Re-join tenant room after reconnection (the WebSocketService also does it
			// internally via currentTenantId, but this ensures the join happens when
			// the service starts before the socket is connected)
			onConnect: () => {
				if (this.tenantId) {
					this.log('📡 [CommercialAvailability] 🔄 Re-uniéndose al tenant room tras reconexión:', this.tenantId);
					ws.joinTenantRoom(this.tenantId);
				}
			}
		});

		// Join tenant room now if already connected
		if (this.tenantId) {
			this.log('📡 [CommercialAvailability] 🏢 Uniéndose al tenant room:', this.tenantId);
			ws.joinTenantRoom(this.tenantId);
		} else {
			debugWarn('📡 [CommercialAvailability] ⚠️ tenantId no disponible todavía; WS join diferido hasta que se obtenga el siteId del REST');
		}
	}

	/**
	 * Returns the last known availability state.
	 */
	getLastKnownState(): { available: boolean | null; onlineCount: number } {
		return {
			available: this.lastAvailability,
			onlineCount: this.lastOnlineCount
		};
	}

	/**
	 * Cleans up the service.
	 */
	cleanup(): void {
		this.onAvailabilityChangeCallback = null;
		this.lastAvailability = null;
		this.lastOnlineCount = 0;
		this.wsListenerRegistered = false;
		this.tenantId = null;
		this.log('🧹 [CommercialAvailability] Servicio limpiado');
	}

	// ─── Private ────────────────────────────────────────────────────────────────

	private notify(available: boolean, onlineCount: number): void {
		if (available !== this.lastAvailability || onlineCount !== this.lastOnlineCount) {
			this.log(`📡 [CommercialAvailability] 🔄 Estado cambió: ${available} (${onlineCount} online)`);
			this.lastAvailability = available;
			this.lastOnlineCount = onlineCount;
			this.onAvailabilityChangeCallback?.(available, onlineCount);
		}
	}

	private log(message: string, ...args: unknown[]): void {
		if (this.config.debug) {
			debugLog(message, ...args);
		}
	}
}
