import { ClientJS } from "clientjs";
import { PipelineProcessor, PipelineProcessorBuilder } from "../pipeline/pipeline-processor";
import { PipelineStage } from "../pipeline/pipeline-stage";
import { ChatMessageReceived, PixelEvent, TrackingType } from "../types";
import { TokenManager } from "./token-manager";
import { TimeStampStage } from "../pipeline/stages/time-stamp-stage";
import { TokenInjectionStage } from "../pipeline/stages/token-stage";
import { ValidationStage } from "../pipeline/stages/validation-stage";
import { MetadataInjectionStage } from "../pipeline/stages/metadata-stage";
import { URLInjectionStage } from "../pipeline/stages/url-injection-stage";
import { SessionInjectionStage } from "../pipeline/stages/session-injection-stage";
import { TrackingEventV2Stage } from "../pipeline/stages/tracking-event-v2-stage";
import { TrackingV2TransformStage } from "../pipeline/stages/tracking-v2-transform-stage";
import { EventQueueManager } from "./event-queue-manager";
import { TrackingV2Service } from "../services/tracking-v2-service";
import { EventThrottler } from "./event-throttler";
import { EventAggregator } from "./event-aggregator";
import { ChatUI } from "../presentation/chat";
// ChatMessagesUI removed — pagination is managed via Preact hooks
import { VisitorsV2Service } from "../services/visitors-v2-service";
import { ChatV2Service } from "../services/chat-v2-service";
import { resolveDefaultEndpoints } from "./endpoint-resolver";
import { EndpointManager } from "./endpoint-manager";

// Re-export para mantener compatibilidad hacia atrás
export { EndpointManager } from "./endpoint-manager";
// ChatInputUI removed — onSubmit handled via ChatUIBridge.onSubmit → signal
import { fetchChatDetail, fetchChatDetailV2, ChatDetail, ChatDetailV2, ChatParticipant } from "../services/chat-detail-service";
import { VisitorInfoV2, ChatMetadataV2, ChatPositionConfig, MobileDetectionConfig, ChatListV2, TrackingEventDto } from "../types";
import { v4 as uuidv4 } from "uuid";
import { DomTrackingManager, DefaultTrackDataExtractor } from "./dom-tracking-manager";
import { EnhancedDomTrackingManager } from "./enhanced-dom-tracking-manager";
import { HeuristicDetectionConfig } from "./heuristic-element-detector";
import { SessionTrackingManager, SessionTrackingConfig } from "./session-tracking-manager";
import { ChatSessionStore } from "../services/chat-session-store";
import { IdentitySignal } from "./identity-signal";
import { ActiveHoursValidator } from "./active-hours-validator";
import { ActiveHoursConfig, AIConfig } from "../types";
import { WebSocketService } from "../services/websocket-service";
import { ChatCreatedEvent } from "../types/websocket-types";
import { SignalState } from "./signal";
import { IdentityWithChatsData } from "./identity-signal";
import { RealtimeMessageManager } from "../services/realtime-message-manager";
import { ConsentManager, ConsentManagerConfig, ConsentState } from "./consent-manager";
import { ConsentBackendService } from "../services/consent-backend-service";
import { ConsentBannerConfig } from '../presentation/types/consent-types';
// ConsentBannerUI removed — banner is mounted via ChatUIBridge.showConsentBanner
import { QuickActionsConfig } from "../presentation/types/quick-actions-types";
import { ChatSelectorConfig } from "../presentation/types/chat-selector-types";
import { debugLog } from "../utils/debug-logger";
import { CommercialAvailabilityService } from "../services/commercial-availability-service";
import { CommercialAvailabilityConfig } from "../types";
import { PresenceService } from "../services/presence-service";
import { PresenceManager, PresenceChatUILike } from "./presence-manager";


interface SDKOptions {
	endpoint?: string;
	webSocketEndpoint?: string;
	apiKey: string;
	autoFlush?: boolean;
	flushInterval?: number;
	maxRetries?: number;
	// Authentication mode: 'jwt' (legacy) or 'session' (V2 cookie based)
	authMode?: 'jwt' | 'session';
	// Heuristic detection options
	heuristicDetection?: {
		enabled?: boolean;
		config?: Partial<HeuristicDetectionConfig>;
	};
	// Session tracking options
	sessionTracking?: {
		enabled?: boolean;
		config?: Partial<SessionTrackingConfig>;
		// Advanced options for Intercom-like behavior
		activityDetection?: {
			enabled?: boolean;
			inactivityThreshold?: number; // ms before considering user inactive
			debounceDelay?: number; // ms to debounce activity events
		};
		multiTabSupport?: {
			enabled?: boolean;
			crossTabSync?: boolean;
		};
	};
	// Chat consent message options (GDPR-style consent notice in chat)
	chatConsentMessage?: Partial<import('../presentation/types/chat-types').ChatConsentMessageConfig>;
	// Active hours configuration
	activeHours?: Partial<ActiveHoursConfig>;
	// Chat widget positioning
	chatPosition?: ChatPositionConfig;
	// Mobile device detection configuration
	mobileDetection?: MobileDetectionConfig;
	// GDPR Consent Configuration
	requireConsent?: boolean; // If false, SDK initializes without consent (default: true)
	consent?: Partial<ConsentManagerConfig>; // Advanced consent options
	consentBanner?: ConsentBannerConfig; // Consent banner UI (auto-render banner for GDPR)
	// Commercial Availability Configuration
	commercialAvailability?: Partial<CommercialAvailabilityConfig>; // Auto show/hide chat based on commercial availability
	// Presence & Typing Indicators Configuration
	presence?: {
		enabled?: boolean;              // Enable presence system (default: true)
		showTypingIndicator?: boolean;  // Show typing indicators (default: true)
		typingDebounce?: number;        // Debounce delay before sending typing:start in ms (default: 300)
		typingTimeout?: number;         // Auto-stop typing after inactivity in ms (default: 2000)
		pollingInterval?: number;       // Presence polling interval in ms (default: 30000)
		showOfflineBanner?: boolean;    // Show offline banner when commercial is offline (default: true)
		heartbeatInterval?: number;     // Heartbeat interval in ms (default: 30000 = 30s según guía oficial)
		userInteractionThrottle?: number; // User interaction throttle in ms (default: 5000 = 5s)
	};
	// Auto-open chat when message received
	autoOpenChatOnMessage?: boolean;    // Auto-open chat when new message arrives (default: true)
	// Quick Actions Configuration (fast action buttons in chat)
	quickActions?: Partial<QuickActionsConfig>;
	// AI Configuration (display options for AI-generated messages)
	ai?: Partial<AIConfig>;
	// Chat Selector Configuration (manage multiple conversations)
	chatSelector?: Partial<ChatSelectorConfig>;
	/**
	 * Theme for the chat widget UI.
	 * Built-in: 'default' (slate/white) | 'carbon' (Vercel-style true blacks).
	 * Defaults to 'default'.
	 */
	theme?: string;
	/**
	 * Color-scheme override for the chat widget.
	 * - 'dark'   — force dark mode regardless of OS preference
	 * - 'light'  — force light mode regardless of OS preference
	 * - 'system' — follow the OS preference via prefers-color-scheme (default)
	 */
	colorScheme?: 'dark' | 'light' | 'system';
	// Tracking V2 Configuration
	trackingV2?: {
		enabled?: boolean;        // Enable tracking V2 (default: true)
		batchSize?: number;       // Max batch size (default: 500)
		flushInterval?: number;   // Flush interval in ms (default: 5000)
		maxQueueSize?: number;    // Max queue size (default: 1000)
		persistQueue?: boolean;   // Persist queue in localStorage (default: true)
		bypassConsent?: boolean;  // Bypass consent checks (development only, default: false)
		throttling?: Partial<import('../types').TrackingV2ThrottlingConfig>;  // Throttling configuration
		aggregation?: Partial<import('../types').TrackingV2AggregationConfig>; // Aggregation configuration
		eventTtlMs?: number;      // Event TTL in milliseconds (default: 86400000 = 24h)
		maxPayloadSizeBytes?: number; // Max payload size in bytes (default: 1048576 = 1MB)
	};
}

export class TrackingPixelSDK {
	private readonly pipelineBuilder = new PipelineProcessorBuilder();
	private eventPipeline: PipelineProcessor<any, PixelEvent>;
	private sessionInjectionStage: SessionInjectionStage;

	private eventQueue: PixelEvent[] = [];
	private eventQueueManager: EventQueueManager | null = null;
	private trackingV2Service: TrackingV2Service | null = null;
	private trackingV2Enabled: boolean = true;
	private eventThrottler: EventThrottler | null = null;
	private eventAggregator: EventAggregator | null = null;
	private bypassConsentForTracking: boolean = false; // Development only: bypass consent checks
	private endpoint: string;
	private webSocketEndpoint: string;
	private apiKey: string;
	private fingerprint: string | null = null;
	private chatUI: ChatUI | null = null;
	// chatInputUI removed — handled via ChatUIBridge.onSubmit signal
	// chatToggleButton removed — toggle is managed via ChatUIBridge signals

	private autoFlush = false;
	private flushInterval = 10000;
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private maxRetries = 3;
	private listeners = new Map<string, Set<(msg: PixelEvent) => void>>();
	private domTrackingManager: DomTrackingManager | EnhancedDomTrackingManager;
	private sessionTrackingManager: SessionTrackingManager | null = null;
	private heuristicEnabled: boolean;
	private authMode: 'jwt' | 'session';
	private identitySignal: IdentitySignal;
	private chatConsentMessageConfig?: Partial<import('../presentation/types/chat-types').ChatConsentMessageConfig>;
	private chatPositionConfig?: ChatPositionConfig;
	private mobileDetectionConfig?: MobileDetectionConfig;
	private activeHoursValidator?: ActiveHoursValidator;
	private identifyExecuted: boolean = false; // Flag para prevenir múltiples llamadas a identify()
	/** Evita doble createChatAuto en el mismo load tras identify. */
	private siteEntryPendingEnsured: boolean = false;
	private wsService: WebSocketService;
	private realtimeMessageManager: RealtimeMessageManager;
	private presenceManager: PresenceManager | null = null;
	private consentManager: ConsentManager;
	private consentBackendService: ConsentBackendService;
	// consentBanner removed — mounted via ChatUIBridge.showConsentBanner
	private commercialAvailabilityService: CommercialAvailabilityService | null = null;
	private commercialAvailabilityConfig?: Partial<CommercialAvailabilityConfig>;
	private presenceConfig: {
		enabled: boolean;
		showTypingIndicator: boolean;
		typingDebounce: number;
		typingTimeout: number;
		pollingInterval: number;
		showOfflineBanner: boolean;
		heartbeatInterval?: number;
		userInteractionThrottle?: number;
	};
	private autoOpenChatOnMessage: boolean = true;
	private quickActionsConfig?: Partial<QuickActionsConfig>;
	private aiConfig?: Partial<AIConfig>;
	private chatSelectorConfig?: Partial<ChatSelectorConfig>;
	private themeId?: string;
	private colorSchemeOverride?: 'dark' | 'light' | 'system';
	// Flag para indicar que el usuario quiere crear un nuevo chat
	// Se establece en true cuando se pulsa "Nueva conversación"
	// Se usa para forzar la creación de chat nuevo en Quick Actions
	private pendingNewChat: boolean = false;

	constructor(options: SDKOptions) {
		console.log('🚀 [TrackingPixelSDK] Constructor llamado con chatSelector:', options.chatSelector);

		const defaults = resolveDefaultEndpoints();
		const endpoint = options.endpoint || defaults.endpoint;
		const webSocketEndpoint = options.webSocketEndpoint || defaults.webSocketEndpoint;
		EndpointManager.setInstance(endpoint, webSocketEndpoint);

		this.endpoint = endpoint;
		this.webSocketEndpoint = webSocketEndpoint;
		this.apiKey = options.apiKey;
		this.authMode = options.authMode || 'session';
		this.autoFlush = options.autoFlush ?? false;
		this.flushInterval = options.flushInterval ?? 10000;
		this.maxRetries = options.maxRetries ?? 3;

		// Configurar mensaje de consentimiento del chat (opcional)
		this.chatConsentMessageConfig = options.chatConsentMessage;

		// Configurar posición del chat (opcional)
		this.chatPositionConfig = options.chatPosition;

		// Configurar detección de dispositivo móvil (opcional)
		this.mobileDetectionConfig = options.mobileDetection;

		// Configurar sistema de presencia y typing indicators
		this.presenceConfig = {
			enabled: options.presence?.enabled ?? true,
			showTypingIndicator: options.presence?.showTypingIndicator ?? true,
			typingDebounce: options.presence?.typingDebounce ?? 300,
			typingTimeout: options.presence?.typingTimeout ?? 2000,
			pollingInterval: options.presence?.pollingInterval ?? 30000,
			showOfflineBanner: options.presence?.showOfflineBanner ?? true,
			heartbeatInterval: options.presence?.heartbeatInterval ?? 60000,
			userInteractionThrottle: options.presence?.userInteractionThrottle ?? 5000
		};

		debugLog('[TrackingPixelSDK] 🟢 Configuración de presencia:', this.presenceConfig);

		// Auto-open chat when new message arrives (default true)
		this.autoOpenChatOnMessage = options.autoOpenChatOnMessage ?? true;
		debugLog('[TrackingPixelSDK] 📬 Auto-apertura del chat:', this.autoOpenChatOnMessage ? 'habilitada' : 'deshabilitada');

		// Configurar Quick Actions (botones de acción rápida)
		this.quickActionsConfig = options.quickActions;

		// 🤖 Configurar IA (opciones de visualización para mensajes de IA)
		this.aiConfig = options.ai;
		if (this.aiConfig) {
			debugLog('[TrackingPixelSDK] 🤖 Configuración de IA:', this.aiConfig);
		}

		// 📋 Configurar Chat Selector (múltiples conversaciones)
		this.chatSelectorConfig = options.chatSelector;
		if (this.chatSelectorConfig?.enabled) {
			debugLog('[TrackingPixelSDK] 📋 Configuración de Chat Selector:', this.chatSelectorConfig);
		}

		// 🎨 Theme
		this.themeId = options.theme;

		// 🌓 Color-scheme override (dark / light / system)
		this.colorSchemeOverride = options.colorScheme;

		// Configurar validador de horarios activos si se proporciona
		if (options.activeHours && options.activeHours.enabled) {
			const activeHoursConfig: ActiveHoursConfig = {
				enabled: true,
				ranges: options.activeHours.ranges || [],
				timezone: options.activeHours.timezone,
				fallbackMessage: options.activeHours.fallbackMessage
			};

			// Validar la configuración antes de crear el validador
			const configErrors = ActiveHoursValidator.validateConfig(activeHoursConfig);
			if (configErrors.length > 0) {
			} else {
				this.activeHoursValidator = new ActiveHoursValidator(activeHoursConfig);
				debugLog('[TrackingPixelSDK] 🕐 Validador de horarios activos configurado:', activeHoursConfig);
			}
		}

		// Configurar Tracking V2
		this.trackingV2Enabled = options.trackingV2?.enabled ?? true;
		this.bypassConsentForTracking = options.trackingV2?.bypassConsent ?? false;

		if (this.bypassConsentForTracking) {
		}

		if (this.trackingV2Enabled) {
			// Inicializar EventQueueManager
			this.eventQueueManager = new EventQueueManager({
				maxSize: options.trackingV2?.maxQueueSize ?? 1000,
				persistEnabled: options.trackingV2?.persistQueue ?? true,
				ttlMs: options.trackingV2?.eventTtlMs ?? 86400000 // 24 horas por defecto
			});

			// Inicializar TrackingV2Service (singleton)
			this.trackingV2Service = TrackingV2Service.getInstance();

			// Inicializar EventThrottler
			this.eventThrottler = new EventThrottler({
				enabled: options.trackingV2?.throttling?.enabled ?? true,
				rules: options.trackingV2?.throttling?.rules ?? {},
				debug: options.trackingV2?.throttling?.debug ?? false
			});

			// Inicializar EventAggregator
			this.eventAggregator = new EventAggregator({
				enabled: options.trackingV2?.aggregation?.enabled ?? true,
				windowMs: options.trackingV2?.aggregation?.windowMs ?? 1000,
				maxBufferSize: options.trackingV2?.aggregation?.maxBufferSize ?? 1000,
				debug: options.trackingV2?.aggregation?.debug ?? false,
				onFlush: (events) => {
					// Callback para auto-flush: encolar eventos agregados
					events.forEach(event => {
						if (this.eventQueueManager) {
							this.eventQueueManager.enqueue(event);
						}
					});
					debugLog(`[TrackingPixelSDK] 🔗 Auto-flush agregador: ${events.length} eventos encolados`);
				}
			});

			debugLog('[TrackingPixelSDK] 📊 Tracking V2 habilitado', {
				batchSize: options.trackingV2?.batchSize ?? 500,
				flushInterval: options.trackingV2?.flushInterval ?? 5000,
				throttling: this.eventThrottler.isEnabled(),
				aggregation: this.eventAggregator.isEnabled(),
				bypassConsent: this.bypassConsentForTracking
			});
		} else {
			debugLog('[TrackingPixelSDK] ⚠️ Tracking V2 deshabilitado');
		}

		// NO escribir en localStorage aquí - se hará después del consentimiento
		// localStorage se usa solo después de verificar consentimiento en init()

		// Inicializar el signal de identity
		this.identitySignal = IdentitySignal.getInstance();

		// Inicializar servicios de WebSocket y mensajería en tiempo real
		this.wsService = WebSocketService.getInstance();
		this.realtimeMessageManager = RealtimeMessageManager.getInstance();
		this.presenceManager = new PresenceManager(this.wsService, this.presenceConfig);

		// Nota: PresenceService se inicializará después de identify() cuando tengamos visitorId
		// Ver método `setupPresenceService()` para la inicialización real

		// Inicializar el gestor de consentimiento GDPR
		// requireConsent (default: false) controla si se requiere consentimiento
		// Si requireConsent es false, el SDK se inicializa sin esperar consentimiento
		const requireConsent = options.requireConsent ?? false;
		const waitForConsent = options.consent?.waitForConsent ?? requireConsent;
		const defaultStatus = requireConsent ? (options.consent?.defaultStatus || 'pending') : 'granted';

		this.consentManager = ConsentManager.getInstance({
			version: __SDK_VERSION__, // Versión sincronizada automáticamente desde package.json
			waitForConsent: waitForConsent,
			defaultStatus: defaultStatus,
			onConsentChange: (state) => {
				debugLog('[TrackingPixelSDK] 🔐 Estado de consentimiento cambiado:', state);

				// Si se otorga el consentimiento, iniciar tracking si estaba pausado
				if (state.status === 'granted') {
					debugLog('[TrackingPixelSDK] ✅ Consentimiento otorgado - habilitando tracking');
					debugLog('[TrackingPixelSDK] 📝 El backend registrará automáticamente el consentimiento en identify()');

					// Inicializar el SDK completo
					this.init().catch(error => {
					});
				}

				// Si se deniega o revoca, detener tracking
				if (state.status === 'denied') {
					debugLog('[TrackingPixelSDK] ❌ Consentimiento denegado - deshabilitando tracking');
					this.stopTrackingActivities();
				}

				// Llamar al callback del usuario si existe
				if (options.consent?.onConsentChange) {
					options.consent.onConsentChange(state);
				}
			}
		});

		// Inicializar el servicio de backend de consentimientos
		this.consentBackendService = ConsentBackendService.getInstance();
		debugLog('[TrackingPixelSDK] 🔐 ConsentBackendService inicializado');

		// Configurar disponibilidad de comerciales (opcional)
		this.commercialAvailabilityConfig = options.commercialAvailability;

		// Inicializar el banner de consentimiento si está configurado
		// Solo mostrar el banner si se requiere consentimiento
		if (requireConsent && options.consentBanner && options.consentBanner.enabled !== false) {
			this.initConsentBanner(options.consentBanner);
		}

		// Crear la instancia de SessionInjectionStage
		this.sessionInjectionStage = new SessionInjectionStage();

		this.pipelineBuilder.addStage(new TimeStampStage());
		if (this.authMode === 'jwt') {
			this.pipelineBuilder.addStage(new TokenInjectionStage());
		} else {
			debugLog('[TrackingPixelSDK] 🔐 authMode=session: omitiendo TokenInjectionStage');
		}
		this.eventPipeline = this.pipelineBuilder
			.addStage(new URLInjectionStage())
			.addStage(this.sessionInjectionStage)
			.addStage(new MetadataInjectionStage())
			.addStage(new TrackingV2TransformStage())
			.addStage(new ValidationStage(this.authMode))
			.build();

		// Initialize heuristic detection settings
		this.heuristicEnabled = options.heuristicDetection?.enabled ?? true;
		
		// Create enhanced DOM tracking manager if heuristic detection is enabled
		if (this.heuristicEnabled) {
			debugLog('[TrackingPixelSDK] 🚀 Initializing with heuristic detection enabled');
			this.domTrackingManager = new EnhancedDomTrackingManager(
				(params) => this.track(params),
				new DefaultTrackDataExtractor(),
				options.heuristicDetection?.config || {}
			);
		} else {
			debugLog('[TrackingPixelSDK] Initializing with legacy DOM tracking');
			this.domTrackingManager = new DomTrackingManager((params) => this.track(params));
		}

		// Initialize session tracking if enabled
		const sessionTrackingEnabled = options.sessionTracking?.enabled ?? true;
		if (sessionTrackingEnabled) {
			debugLog('[TrackingPixelSDK] 📊 Initializing advanced session tracking with Intercom-like features');
			
			// Build enhanced session tracking config
			const baseConfig = options.sessionTracking?.config || {};
			const activityOptions = options.sessionTracking?.activityDetection || {};
			const multiTabOptions = options.sessionTracking?.multiTabSupport || {};
			
			const enhancedConfig: Partial<SessionTrackingConfig> = {
				...baseConfig,
				maxInactivityTime: activityOptions.inactivityThreshold ?? 60000, // 1 minute
				// Set reasonable defaults for Intercom-like behavior
				heartbeatInterval: baseConfig.heartbeatInterval ?? 10000, // 10 seconds
			};
			
			this.sessionTrackingManager = new SessionTrackingManager(
				(params) => {
					setTimeout(() => {
						this.track(params);

						// Emitir actividad via WebSocket para reactivar presencia
						// Solo si está conectado; si no, se emitirá automáticamente al reconectar
						if (params.event === 'user_resume' || params.event === 'session_reactivate') {
							if (this.wsService.isConnected()) {
								this.wsService.emitUserActivity(true);
							}
						}
					}, 500); // Delay to ensure session data is ready
				},
				enhancedConfig
			);
			
			// Conectar el SessionTrackingManager con la pipeline stage
			this.sessionInjectionStage.setSessionManager(this.sessionTrackingManager);
			
			debugLog('[TrackingPixelSDK] Session tracking configured with enhanced features:', {
				heartbeatInterval: enhancedConfig.heartbeatInterval,
				inactivityThreshold: enhancedConfig.maxInactivityTime,
			});
		}

		// GDPR Compliance: Verificar estado de consentimiento inicial
		const initialState = this.consentManager.getState();

		if (initialState.status === 'pending') {
			// NO inicializar SDK - esperar a que se otorgue consentimiento
			debugLog('[TrackingPixelSDK] 🔐 Estado inicial: pending - SDK pausado');
			debugLog('[TrackingPixelSDK] ⏸️ SDK pausado hasta que se otorgue consentimiento');
		} else if (initialState.status === 'granted') {
			// Inicializar inmediatamente
			debugLog('[TrackingPixelSDK] 🔐 Estado inicial: granted - Inicializando SDK');
			this.init().catch(error => {
			});
		} else {
			// Estado denied - no hacer nada
			debugLog('[TrackingPixelSDK] 🔐 Estado inicial: denied - SDK no se inicializará');
		}
	}

	public async init(): Promise<void> {
		// Nota: Este método inicializa completamente el SDK (localStorage, UI, tracking)
		// Solo debe llamarse cuando el consentimiento está 'granted'
		// La verificación se hace en el constructor y en onConsentChange
		// Para registrar rechazos de consentimiento, usar identitySignal.identify() directamente

		// ✅ VALIDAR CONSENTIMIENTO antes de inicializar
		const consentState = this.consentManager.getState();
		if (consentState.status !== 'granted') {
			debugLog('[TrackingPixelSDK] 🔒 init() bloqueado: consentimiento no otorgado (status: ' + consentState.status + ')');
			return; // No inicializar si no hay consentimiento
		}

		debugLog('[TrackingPixelSDK] 🚀 Inicializando SDK con consentimiento otorgado...');

		// ✅ GDPR COMPLIANT: Solo escribir en localStorage después de verificar consentimiento
		debugLog('[TrackingPixelSDK] 🔐 Consentimiento verificado - guardando configuración en localStorage');
		localStorage.setItem("pixelEndpoint", this.endpoint);
		localStorage.setItem("guidersApiKey", this.apiKey);

		// Configurar el cliente
		const client = new ClientJS();
		this.fingerprint = localStorage.getItem("fingerprint") || client.getFingerprint().toString();
		localStorage.setItem("fingerprint", this.fingerprint);

		if (this.authMode === 'jwt') {
			TokenManager.loadTokensFromStorage();
		}

		// Inicializar Tracking V2 Service
		if (this.trackingV2Enabled && this.trackingV2Service) {
			try {
				await this.trackingV2Service.initialize(this.apiKey);
				debugLog('[TrackingPixelSDK] ✅ TrackingV2Service inicializado');
			} catch (error) {
			}
		}

		// Inicializar ChatV2Service temprano para activar el visibility handler
		// Esto asegura que la sesión se reconecte cuando el usuario vuelve a la pestaña
		ChatV2Service.getInstance();
		debugLog('[TrackingPixelSDK] ✅ ChatV2Service inicializado (session keepalive activo)');

		debugLog("✅ SDK inicializado sin servicios de WebSocket.");

		if (this.autoFlush) {
			this.startAutoFlush();
		}

		debugLog("SDK listo para tracking...");

		// La identificación del visitante ahora se realiza solo cuando se abre la pestaña
		// mediante un listener de visibilitychange/focus
		this.setupTabOpenListener();
		// Guardar la referencia al chat para usarla más tarde (ej: mostrar mensajes del sistema)
		this.chatUI = new ChatUI({
			widget: true,
			chatConsentMessage: this.chatConsentMessageConfig,
			position: this.chatPositionConfig,
			mobileDetection: this.mobileDetectionConfig,
			quickActions: this.quickActionsConfig,
			// 🤖 Configuración de IA para renderizado de mensajes
			ai: this.aiConfig,
			// 📋 Configuración del selector de chats
			chatSelector: this.chatSelectorConfig,
			// 🎨 Theme
			theme: this.themeId,
			// 🌓 Color-scheme override
			colorScheme: this.colorSchemeOverride,
		});

		// Configurar callbacks de Quick Actions
		this.setupQuickActionsCallbacks();

		// Configurar callbacks de Chat Selector
		this.setupChatSelectorCallbacks();
		const chat = this.chatUI; // Alias para mantener compatibilidad con el código existente
		// ChatInputUI removed — onSubmit is handled via ChatUIBridge.onSubmit → signal
		// Toggle button is now managed by Preact via ChatUIBridge
		// (the same `chat` instance exposes the toggle API — no separate alias needed)

		const initializeChatComponents = () => {
			debugLog("Inicializando componentes del chat rápidamente...");
			
			// Verificar horarios activos antes de inicializar
			if (this.activeHoursValidator && !this.activeHoursValidator.isChatActive()) {
				debugLog("🕐 Chat no está disponible según horarios configurados");
				
				// Inicializar componentes pero mantener el chat oculto
				chat.init();
				chat.hide();
				
				
				// No mostrar el botón de chat cuando está fuera de horarios
				chat.initToggleButton();
				chat.hideToggleButton();
				
				// Mostrar mensaje de horarios si está disponible
				const fallbackMessage = this.activeHoursValidator.getFallbackMessage();
				const nextAvailable = this.activeHoursValidator.getNextAvailableTime();
				
				let statusMessage = fallbackMessage;
				if (nextAvailable) {
					statusMessage += ` Próximo horario disponible: ${nextAvailable}`;
				}
				
				debugLog("🕐 " + statusMessage);
				
				// Opcionalmente, agregar mensaje al chat (oculto) para cuando se active
				if (chat) {
					chat.addSystemMessage(statusMessage);
				}
				
				// Configurar verificación periódica de horarios (cada 5 minutos)
				const checkInterval = setInterval(() => {
					if (this.activeHoursValidator && this.activeHoursValidator.isChatActive()) {
						debugLog("🕐 ✅ Chat ahora está disponible según horarios");
						chat.showToggleButton();
						clearInterval(checkInterval);
					}
				}, 5 * 60 * 1000); // 5 minutos
				
				return; // No continuar con la inicialización normal
			}
			
			// Inicialización normal del chat cuando está en horarios activos
			// Inicializar componentes (el chat comienza oculto por defecto)
			chat.init();
			// Asegurarnos explícitamente que el chat esté oculto ANTES de inicializar cualquier
			// otro componente para evitar que el chat se muestre y luego se oculte
			chat.hide();
			// Inicializar los demás componentes después de ocultar el chat
			
			chat.initToggleButton();
			
			// Añadir listener para mensajes de sistema
			const chatEls = document.querySelectorAll('.chat-widget, .chat-widget-fixed');
			chatEls.forEach(el => {
				el.addEventListener('system-message', (event: Event) => {
					const customEvent = event as CustomEvent;
					chat.addSystemMessage(customEvent.detail.message);
				});
			});

			debugLog("Componentes del chat inicializados. Chat oculto por defecto.");

			// Inicializar servicio de disponibilidad de comerciales (API v2)
			// Este servicio hace polling y actualiza la visibilidad del chat automáticamente
			// IMPORTANTE: Llamar ANTES de mostrar el botón para evitar flash visual
			this.initializeCommercialAvailability(chat);

			// Mostrar el botón solo si la verificación de disponibilidad NO está habilitada
			// Si está habilitada, el servicio se encargará de mostrarlo cuando haya comerciales disponibles
			if (!this.commercialAvailabilityConfig?.enabled) {
				// Validar consentimiento antes de mostrar el chat
				const consentState = this.consentManager.getState();
				if (consentState.status === 'granted' && consentState.preferences?.functional) {
					chat.showToggleButton();
					debugLog("🔘 Botón de chat mostrado (consentimiento otorgado)");
				} else {
					debugLog("🔒 Chat oculto: consentimiento no otorgado o funcional deshabilitado");
				}
			} else {
				debugLog("🔘 Botón de chat oculto inicialmente (esperando verificación de disponibilidad)");
			}

			// Escuchar eventos de cambio de estado online de participantes
			this.setupParticipantEventsListener(chat);
		
			chat.onOpen(async () => {
				this.captureEvent("visitor:open-chat", {
					timestamp: new Date().getTime(),
					chatId: chat.getChatId(),
				});

			// 🔓 Notificar al backend que el chat se ha abierto
			const openingChatId = chat.getChatId();
			if (openingChatId) {
				try {
					await ChatV2Service.getInstance().openChat(openingChatId);
					debugLog("🔓 [TrackingPixelSDK] Chat abierto en backend:", openingChatId);
				} catch (error) {
				}
			}

				// 📡 Actualizar estado del toggle button
				chat.updateToggleState(true);

				// 💬 Notificar al servicio de mensajes no leídos que el chat está abierto
				// Esto pausa las notificaciones de badge mientras el chat está visible
				chat.notifyChatOpenState(true);
				debugLog('💬 [TrackingPixelSDK] Notificado: chat abierto - badge pausado');

				// 📡 Inicializar WebSocket si no está conectado
				this.initializeWebSocketConnection(chat);

				// Cargar mensajes del chat si existe un chatId
				this.loadChatMessagesOnOpen(chat);

				// 📬 Marcar todos los mensajes como leídos cuando se abre el chat
				if (this.chatUI) {
					setTimeout(async () => {
						await this.chatUI!.markAllMessagesAsRead();
						debugLog('📬 [TrackingPixelSDK] Mensajes marcados como leídos al abrir chat');
					}, 500); // Reducido a 500ms ya que openChat() ya esperó su respuesta
				}
			});
			chat.onClose(async () => {
				this.captureEvent("visitor:close-chat", {
					timestamp: new Date().getTime(),
					chatId: chat.getChatId(),
				});

			// 🔒 Notificar al backend que el chat se ha cerrado
			const closingChatId = chat.getChatId();
			if (closingChatId) {
				try {
					await ChatV2Service.getInstance().closeChat(closingChatId);
					debugLog("🔒 [TrackingPixelSDK] Chat cerrado en backend:", closingChatId);
				} catch (error) {
				}
			}

				// 📡 Actualizar estado del toggle button
				chat.updateToggleState(false);

				// 💬 Notificar al servicio de mensajes no leídos que el chat está cerrado
				// Esto reanuda las notificaciones de badge
				chat.notifyChatOpenState(false);
				debugLog('💬 [TrackingPixelSDK] Notificado: chat cerrado - badge reactivado');

				// 📬 Refrescar estado de mensajes no leídos al cerrar el chat
				const chatIdForRefresh = chat.getChatId();
				if (chatIdForRefresh) {
					chat.setActiveChatForUnread(chatIdForRefresh);
					debugLog('📬 [TrackingPixelSDK] Refrescando mensajes no leídos al cerrar chat');
				}
			});
		
			chat.onActiveInterval(() => {
				debugLog("Intervalo activo");
				this.captureEvent("visitor:chat-active", {
					timestamp: new Date().getTime(),
					chatId: chat.getChatId(),
				});
			}, 1000 * 10); // 10 segundos de intervalo
		
			chat.onToggle((visible: boolean) => {
				debugLog(`Toggle event: chat debe estar ${visible ? 'visible' : 'oculto'}`);
				if (visible) {
					// Mostrar el chat si debe estar visible
					chat.show();
				} else {
					// Ocultar el chat si debe estar oculto
					chat.hide();
				}
			});
		
		chat.onSubmit(async (message: string) => {
			if (!message) return;
			
			debugLog('💬 [TrackingPixelSDK] 📝 Mensaje enviado desde UI:', message);
			
			// Capturar el evento de tracking como antes
			this.captureEvent("visitor:send-message", { 
				id: uuidv4(),
				message,
				timestamp: new Date().getTime(),
				chatId: chat.getChatId(),
			});
			this.flush();

			// Verificar estado del visitante
			const visitorId = this.getVisitorId();
			const isIdentified = this.isVisitorIdentified();
			debugLog('💬 [TrackingPixelSDK] 🔍 Estado del visitante:', {
				visitorId,
				isIdentified,
				identityState: this.identitySignal.getState()
			});

			if (!visitorId) {
				
				try {
					await this.executeIdentify();
					const newVisitorId = this.getVisitorId();
					if (!newVisitorId) {
						return;
					}
					debugLog('💬 [TrackingPixelSDK] ✅ Visitante identificado:', newVisitorId);
				} catch (error) {
					return;
				}
			}

			// Lógica optimizada: usar chatId existente o crear nuevo chat (con protección anti-duplicados)
			try {
				const finalVisitorId = this.getVisitorId();
				const currentChatId = chat.getChatId();
				
				debugLog('💬 [TrackingPixelSDK] 📤 Enviando mensaje para visitante:', finalVisitorId);
				debugLog('💬 [TrackingPixelSDK] 🔍 Chat ID actual:', currentChatId);

				let result;

				if (currentChatId) {
					// Ya existe un chat activo, usar sistema de tiempo real (WebSocket)
					debugLog('💬 [TrackingPixelSDK] 📋 Enviando mensaje a chat existente (WebSocket):', currentChatId);
					
					// Asegurarse de que WebSocket esté inicializado
					if (!this.wsService.isConnected()) {
						this.initializeWebSocketConnection(chat);
					}
					
					// Asegurarse de que el chat esté configurado en el manager
					if (this.realtimeMessageManager.getCurrentChatId() !== currentChatId) {
						this.realtimeMessageManager.setCurrentChat(currentChatId);
					}
					
					// Enviar mensaje via RealtimeMessageManager (HTTP POST + notificación WebSocket)
					await this.realtimeMessageManager.sendMessage(message, 'text');

					result = {
						chat: { id: currentChatId },
						message: { id: 'pending' }, // El ID real llegará via WebSocket
						isNewChat: false
					};
				} else {
					// No hay chat activo, verificar si ya se está creando uno
					if (chat.isCreatingChat()) {
						debugLog('💬 [TrackingPixelSDK] ⏳ Ya se está creando un chat, esperando...');
						// Esperar a que se complete la creación del chat actual
						await chat.waitForChatCreation();
						// Intentar enviar el mensaje al chat recién creado
						const newChatId = chat.getChatId();
						if (newChatId) {
							debugLog('💬 [TrackingPixelSDK] 📋 Enviando mensaje a chat recién creado:', newChatId);
							const message_sent = await ChatV2Service.getInstance().sendMessage(
								newChatId,
								message,
								'text'
							);
							result = {
								chat: { id: newChatId },
								message: message_sent,
								isNewChat: false
							};
						} else {
							throw new Error('No se pudo obtener el chatId después de la creación');
						}
					} else {
						// Marcar que se está creando un chat para evitar duplicados
						chat.setCreatingChat(true);
						
						debugLog('💬 [TrackingPixelSDK] 🆕 Creando nuevo chat con mensaje');
						
						try {
							const chatWithMessage = await ChatV2Service.getInstance().createChatWithMessage(
								{}, // chatData vacío
								{ content: message, type: 'text' } // messageData
							);

							// La respuesta viene directamente con chatId, no chat.id
							const newChatId = chatWithMessage.chatId;
							if (newChatId) {
								chat.setChatId(newChatId);
								debugLog('💬 [TrackingPixelSDK] 🆕 Chat ID asignado:', newChatId);
								
								// 📡 Inicializar WebSocket para el nuevo chat
								this.initializeWebSocketConnection(chat);
								this.realtimeMessageManager.setCurrentChat(newChatId);
							}

							result = {
								chat: { id: newChatId },
								message: { id: chatWithMessage.messageId },
								isNewChat: true
							};
						} finally {
							// Siempre marcar que ya no se está creando el chat
							chat.setCreatingChat(false);
						}
					}
				}

				if (result) {
					debugLog('💬 [TrackingPixelSDK] ✅ Mensaje enviado exitosamente:', {
						chatId: result.chat.id,
						isNewChat: result.isNewChat
					});

					this.showVisitorWaitingMessageOnce(chat, result.chat.id);

					// Disparar evento personalizado para dev random messages
					if (typeof window !== 'undefined') {
						const customEvent = new CustomEvent('guidersMessageSent', {
							detail: {
								message: message,
								chatId: result.chat.id,
								isNewChat: result.isNewChat
							}
						});
						window.dispatchEvent(customEvent);
					}
				}
			} catch (error) {
				// En caso de error, asegurar que se libere el bloqueo
				chat.setCreatingChat(false);
			}
		});			this.on("receive-message", (msg: PixelEvent) => {
				// Imprimir el mensaje completo para depuración
				debugLog("Mensaje recibido via WebSocket:", msg);
				
				// Verificar si el mensaje contiene senderId
				if (!msg.data.senderId) {
				}
				
				chat.renderChatMessage({
					text: msg.data.message as string,
					sender: "other",
					senderId: msg.data.senderId as string,
					timestamp: msg.data.timestamp as number
				});
			});
		};
		
		if (document.readyState === "loading") {
			debugLog("El DOM aún no está completamente cargado. Esperando...");
			document.addEventListener("DOMContentLoaded", initializeChatComponents);
			debugLog("Esperando a que el DOM esté completamente cargado...");
		} else {
			debugLog("El DOM ya está completamente cargado.");
			initializeChatComponents();
		}

		// Start session tracking if enabled
		if (this.sessionTrackingManager) {
			debugLog("🎯 Starting session tracking...");
			// Session tracking will auto-initialize if enabled in config
			// The manager is already set up to track events automatically
		}

		// Enable automatic tracking (heuristic detection)
		this.enableAutomaticTracking();

		// Registrar múltiples eventos de cierre para asegurar endSession
		this.setupPageUnloadHandlers();
	}

	/**
	 * Configura los callbacks de Quick Actions en el ChatUI
	 */
	private setupQuickActionsCallbacks(): void {
		if (!this.chatUI) return;

		// Callback para enviar mensaje desde Quick Actions
		this.chatUI.onQuickActionSendMessage = async (message: string, metadata?: Record<string, any>) => {
			// DEBUG: Log siempre visible en consola para diagnóstico
			console.log('[GUIDERS DEBUG] Quick Action: enviando mensaje', message);
			console.log('[GUIDERS DEBUG] 🚩 pendingNewChat =', this.pendingNewChat);

			const currentChatId = this.realtimeMessageManager.getCurrentChatId();
			const chatUIChatId = this.chatUI?.getChatId();
			console.log('[GUIDERS DEBUG] currentChatId (realtimeManager) =', currentChatId);
			console.log('[GUIDERS DEBUG] chatUIChatId =', chatUIChatId);

			// IMPORTANTE: Determinar si debemos crear un nuevo chat.
			// Usamos múltiples señales para ser más robustos:
			// 1. pendingNewChat - flag explícito establecido cuando se pulsa "Nueva conversación"
			// 2. chatUIChatId vacío - indica que el UI no tiene chat activo
			// 3. currentChatId vacío - indica que el manager no tiene chat activo
			const noChatIdInUI = !chatUIChatId || chatUIChatId === '';
			const noChatIdInManager = !currentChatId || currentChatId === '';
			const shouldCreateNewChat = this.pendingNewChat || noChatIdInUI || noChatIdInManager;

			console.log('[GUIDERS DEBUG] shouldCreateNewChat =', shouldCreateNewChat, {
				pendingNewChat: this.pendingNewChat,
				noChatIdInUI,
				noChatIdInManager
			});

			if (!shouldCreateNewChat && currentChatId) {
				// Hay chat activo Y NO queremos crear uno nuevo - enviar mensaje normalmente
				debugLog('[TrackingPixelSDK] Chat activo encontrado, enviando mensaje via realtimeMessageManager');
				await this.realtimeMessageManager.sendMessage(message, 'text');
				if (this.chatUI) {
					this.showVisitorWaitingMessageOnce(this.chatUI, currentChatId);
				}
			} else {
				// Queremos crear un chat nuevo (pendingNewChat=true) o no hay chat activo
				debugLog('[TrackingPixelSDK] FORZANDO creación de chat nuevo...');

				// Resetear el flag inmediatamente para evitar múltiples creaciones
				this.pendingNewChat = false;
				debugLog('[TrackingPixelSDK] 🚩 pendingNewChat = false (reseteado)');

				const visitorId = this.getVisitorId();
				if (!visitorId) {
					debugLog('[TrackingPixelSDK] Error: No hay visitorId');
					return;
				}

				const chatService = ChatV2Service.getInstance();
				// IMPORTANTE: forceNewChat=true para crear un chat nuevo
				// en lugar de reutilizar uno existente
				const result = await chatService.sendMessageSmart(
					visitorId,
					message,
					{
						metadata: {
							source: 'quick_action_send_message',
							...metadata
						}
					},
					'text',
					true // forceNewChat: siempre crear chat nuevo
				);

				debugLog('[TrackingPixelSDK] Chat creado/mensaje enviado:', result);

				// Actualizar chatId en ChatUI y RealtimeMessageManager
				const newChatId = result.chat.id;
				if (this.chatUI) {
					this.chatUI.setChatId(newChatId);
					this.showVisitorWaitingMessageOnce(this.chatUI, newChatId);
				}
				this.realtimeMessageManager.setCurrentChat(newChatId);

				// Renderizar el mensaje enviado en el UI
				if (this.chatUI) {
					this.chatUI.renderChatMessage({
						text: message,
						sender: 'user',
						timestamp: Date.now(),
						senderId: visitorId
					});
				}
			}
		};

		// Callback para solicitar agente humano
		this.chatUI.onQuickActionRequestAgent = async () => {
			debugLog('[TrackingPixelSDK] Quick Action: solicitando agente humano');
			await this.handleRequestAgent();
		};

		// Callback para trackear clics en Quick Actions
		this.chatUI.onTrackQuickAction = (data: Record<string, any>) => {
			debugLog('[TrackingPixelSDK] Quick Action tracked:', data);
			this.captureEvent(data.eventType || 'quick_action_clicked', {
				buttonId: data.buttonId,
				actionType: data.actionType,
				timestamp: data.timestamp
			});
		};

		debugLog('[TrackingPixelSDK] Quick Actions callbacks configurados');
	}

	/**
	 * Configura los callbacks del Chat Selector
	 */
	private setupChatSelectorCallbacks(): void {
		if (!this.chatUI) return;

		// Callback para cambiar de chat
		this.chatUI.onChatSwitch = async (chatId: string) => {
			debugLog('[TrackingPixelSDK] Chat Selector: cambiando a chat', chatId);
			await this.switchChat(chatId);
		};

		// Callback para crear nuevo chat
		this.chatUI.onNewChatRequest = async () => {
			debugLog('[TrackingPixelSDK] Chat Selector: solicitando nuevo chat');
			await this.createNewChat();
		};

		debugLog('[TrackingPixelSDK] Chat Selector callbacks configurados');
	}

	/**
	 * Cambia a un chat específico
	 */
	public async switchChat(chatId: string): Promise<void> {
		debugLog('[TrackingPixelSDK] 🔄 Cambiando a chat:', chatId);

		// Resetear el flag de nuevo chat ya que estamos cambiando a un chat existente
		this.pendingNewChat = false;

		// Limpiar mensajes actuales
		if (this.chatUI) {
			this.chatUI.clearMessages();
			this.chatUI.showLoadingMessages();
		}

		// Actualizar el chatId en el UI y el store
		if (this.chatUI) {
			this.chatUI.setChatId(chatId);
			this.chatUI.updateSelectedChat(chatId);
		}

		// Cambiar a la nueva sala (setCurrentChat maneja leave/join internamente)
		if (this.realtimeMessageManager) {
			this.realtimeMessageManager.setCurrentChat(chatId);
		}

		// Cargar mensajes del nuevo chat (forzar recarga)
		if (this.chatUI) {
			await this.loadChatMessagesOnOpen(this.chatUI, true);
		}

		// Refrescar el header con los datos del nuevo chat
		if (this.chatUI) {
			debugLog('[TrackingPixelSDK] 🔄 Refrescando header del chat');
			await this.chatUI.refreshChatDetailsForced();
		}

		// Trackear el evento
		this.captureEvent('chat_switched', {
			chatId,
			timestamp: Date.now()
		});

		debugLog('[TrackingPixelSDK] ✅ Cambio de chat completado:', chatId);
	}

	/**
	 * Crea un nuevo chat para el visitante
	 *
	 * NOTA: Este método solo resetea el estado del chat actual.
	 * La limpieza de UI y mostrar Quick Actions se hace en ChatUI.resetHeaderToDefault()
	 * que se llama DESPUÉS de este método en el flujo de handleNewChatRequest().
	 */
	public async createNewChat(): Promise<void> {
		debugLog('[TrackingPixelSDK] 🆕 Creando nuevo chat');

		// IMPORTANTE: Marcar que queremos crear un nuevo chat
		// Este flag se usa en onQuickActionSendMessage para forzar la creación
		// de un chat nuevo en lugar de enviar a uno existente
		this.pendingNewChat = true;
		debugLog('[TrackingPixelSDK] 🚩 pendingNewChat = true');

		// Resetear el chat actual en el RealtimeMessageManager
		// Esto sale de la sala WebSocket actual y establece currentChatId a ''
		if (this.realtimeMessageManager) {
			this.realtimeMessageManager.setCurrentChat('');
		}

		// Resetear el estado interno del ChatUI para permitir creación de nuevo chat
		if (this.chatUI) {
			this.chatUI.setChatId('');
			this.chatUI.updateSelectedChat(null);
			this.chatUI.setCreatingChat(false);
			// Clear messages and header so the previous chat's history and agent
			// info are not shown while the visitor composes the first message.
			this.chatUI.clearMessages();
			this.chatUI.resetHeaderToDefault();
		}

		// Trackear el evento
		this.captureEvent('new_chat_requested', {
			timestamp: Date.now()
		});

		debugLog('[TrackingPixelSDK] ✅ Listo para crear nuevo chat');
	}

	/**
	 * Obtiene la lista de chats del visitante actual
	 */
	public async getVisitorChats(): Promise<import('../types').ChatListV2> {
		const visitorId = this.chatUI?.getVisitorId();
		if (!visitorId) {
			throw new Error('No visitor ID available');
		}

		const chatService = ChatV2Service.getInstance();
		return chatService.getVisitorChats(visitorId);
	}

	/**
	 * Maneja la solicitud de agente humano desde Quick Actions
	 */
	private async handleRequestAgent(): Promise<void> {
		debugLog('[TrackingPixelSDK] Procesando solicitud de agente humano');

		try {
			// 1. Trackear el evento
			this.captureEvent('agent_requested', {
				source: 'quick_action',
				timestamp: Date.now()
			});

			// 2. Enviar mensaje al chat
			const message = 'Me gustaría hablar con un agente';
			const currentChatId = this.realtimeMessageManager.getCurrentChatId();

			if (currentChatId) {
				// Hay chat activo - enviar mensaje normalmente
				debugLog('[TrackingPixelSDK] Chat activo encontrado, enviando mensaje');
				await this.realtimeMessageManager.sendMessage(message, 'text');
				if (this.chatUI) {
					this.showVisitorWaitingMessageOnce(this.chatUI, currentChatId);
				}
			} else {
				// No hay chat activo - usar sendMessageSmart para crear chat + mensaje
				debugLog('[TrackingPixelSDK] No hay chat activo, creando chat con mensaje...');
				const visitorId = this.getVisitorId();
				if (!visitorId) {
					debugLog('[TrackingPixelSDK] Error: No hay visitorId');
					return;
				}

				const chatService = ChatV2Service.getInstance();
				const result = await chatService.sendMessageSmart(visitorId, message, {
					metadata: {
						source: 'quick_action_request_agent',
						department: 'sales'
					}
				}, 'text');

				debugLog('[TrackingPixelSDK] Chat creado/mensaje enviado:', result);

				// Actualizar chatId en ChatUI y RealtimeMessageManager
				const newChatId = result.chat.id;
				if (this.chatUI) {
					this.chatUI.setChatId(newChatId);
					this.showVisitorWaitingMessageOnce(this.chatUI, newChatId);
				}
				this.realtimeMessageManager.setCurrentChat(newChatId);

				// Renderizar el mensaje enviado en el UI
				if (this.chatUI) {
					this.chatUI.renderChatMessage({
						text: message,
						sender: 'user',
						timestamp: Date.now(),
						senderId: visitorId
					});
				}
			}

			// 3. Notificar al backend
			await this.notifyAgentRequest();
		} catch (error) {
			debugLog('[TrackingPixelSDK] Error en solicitud de agente:', error);
		}
	}

	/**
	 * Notifica al backend que el usuario quiere hablar con un agente humano
	 */
	private async notifyAgentRequest(): Promise<void> {
		const visitorId = this.getVisitorId();
		const chatId = this.chatUI?.getChatId?.();

		if (!visitorId) {
			debugLog('[TrackingPixelSDK] No hay visitorId para notificar request-agent');
			return;
		}

		if (!chatId) {
			debugLog('[TrackingPixelSDK] No hay chatId para notificar request-agent');
			return;
		}

		const endpoint = EndpointManager.getInstance().getEndpoint();
		const url = `${endpoint}/v2/chats/${chatId}/request-agent`;

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Guiders-SID': visitorId
				},
				body: JSON.stringify({
					visitorId,
					timestamp: new Date().toISOString(),
					source: 'quick_action'
				})
			});

			if (response.ok) {
				debugLog('[TrackingPixelSDK] Notificación request-agent enviada correctamente');
			} else {
				debugLog('[TrackingPixelSDK] Error en request-agent:', response.status);
			}
		} catch (error) {
			debugLog('[TrackingPixelSDK] Error en notifyAgentRequest:', error);
		}
	}

	/**
	 * Configura un listener para detectar cuando se abre una pestaña
	 * y ejecutar /identify únicamente en ese momento.
	 */
	private setupTabOpenListener(): void {
		if (typeof window === 'undefined') return;

		debugLog('[TrackingPixelSDK] 🔍 Configurando listener para apertura de pestaña (una sola vez)');

		// Ejecutar identificación inmediatamente solo al cargar la página
		// No en eventos posteriores de cambio de foco
		if (document.visibilityState === 'visible') {
			debugLog('[TrackingPixelSDK] 🚀 Pestaña cargada - ejecutando identify una sola vez');
			this.executeIdentify();
		} else {
			// Si la página se carga en segundo plano, esperar a que se haga visible
			debugLog('[TrackingPixelSDK] ⏳ Pestaña en segundo plano - esperando visibilidad');
			const onVisibilityChange = () => {
				if (document.visibilityState === 'visible' && !this.identifyExecuted) {
					debugLog('[TrackingPixelSDK] 🚀 Pestaña ahora visible - ejecutando identify');
					this.executeIdentify();
					// Remover listener después de ejecutar (solo una vez)
					document.removeEventListener('visibilitychange', onVisibilityChange);
				}
			};
			document.addEventListener('visibilitychange', onVisibilityChange);

			// Cleanup si la página se cierra sin hacerse visible (evitar memory leak)
			window.addEventListener('beforeunload', () => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
			}, { once: true });
		}

		// NO agregar listeners adicionales para visibilitychange o focus
		// La sesión debe mantenerse durante toda la vida de la pestaña
		// Solo se debe crear una nueva sesión cuando se abre una nueva pestaña/ventana
	}

	/**
	 * Ejecuta la identificación del visitante y carga sus chats.
	 */
	private async executeIdentify(): Promise<void> {
		debugLog('[TrackingPixelSDK] 🔍 executeIdentify() LLAMADO');

		// Prevenir múltiples ejecuciones
		if (this.identifyExecuted) {
			debugLog('[TrackingPixelSDK] ⚠️ identify() ya ejecutado - ignorando llamada duplicada');
			return;
		}

		// Marcar como ejecutado ANTES de llamar para prevenir race conditions
		this.identifyExecuted = true;

		try {
			debugLog('[TrackingPixelSDK] 🔍 Ejecutando identify...');

			// Obtener versión actual del ConsentManager para enviar al backend
			const consentVersion = this.consentManager.getState().version;

			// Usar identitySignal en lugar de llamar directamente al servicio
			const result = await this.identitySignal.identify(this.fingerprint!, this.apiKey, consentVersion);
			if (result?.identity?.visitorId) {
				debugLog('[TrackingPixelSDK] ✅ Visitante identificado con identitySignal:', result.identity.visitorId);

				// Configurar sessionId en ConsentBackendService
				const sessionId = sessionStorage.getItem('guiders_backend_session_id');
				if (sessionId) {
					this.consentBackendService.setSessionId(sessionId);
					debugLog('[TrackingPixelSDK] 🔐 SessionId configurado en ConsentBackendService');
				}

				// 📬 Inicializar servicio de mensajes no leídos con badge tempranamente
				// Esto asegura que el badge se actualice correctamente al refrescar la página
				if (this.chatUI) {
					// Establecer el visitorId en ChatUI para usar en refreshChatDetailsFromVisitorList
					this.chatUI.setVisitorId(result.identity.visitorId);
					debugLog('📬 [TrackingPixelSDK] VisitorId establecido en ChatUI:', result.identity.visitorId);

					this.chatUI.connectUnreadService(
						result.identity.visitorId,
						(chatId: string) => {
							// Callback para abrir el chat automáticamente al recibir un mensaje
							debugLog('📬 [TrackingPixelSDK] 🔓 Auto-abriendo chat por mensaje recibido con chatId:', chatId);

							// 🔧 FIX: Verificar si el chat puede ser abierto automáticamente
							// Esto previene re-apertura si el usuario cerró el chat recientemente
							if (!this.chatUI!.canAutoOpen()) {
								debugLog('📬 [TrackingPixelSDK] ⛔ Auto-apertura cancelada - usuario cerró chat recientemente');
								return;
							}

							// 1️⃣ Actualizar chatId en ChatUI (crítico para chats nuevos iniciados por comercial)
							if (!this.chatUI!.getChatId() || this.chatUI!.getChatId() !== chatId) {
								debugLog('📬 [TrackingPixelSDK] 🆕 Actualizando chatId en ChatUI:', chatId);
								this.chatUI!.setChatId(chatId);
							}

							// 2️⃣ Abrir el chat
							this.chatUI!.show();

							// 3️⃣ Obtener detalles del chat desde la lista de chats del visitante
							// Esto es más robusto que GET /chats/{id} para chats recién creados
							debugLog('📬 [TrackingPixelSDK] 🔄 Obteniendo detalles del chat desde lista del visitante');
							this.chatUI!.refreshChatDetailsFromVisitorList(result.identity.visitorId).catch(err => {
								// Fallback: intentar con el método tradicional
								debugLog('📬 [TrackingPixelSDK] 🔄 Fallback: intentando método tradicional');
								this.chatUI!.refreshChatDetailsForced().catch(err2 => {
								});
							});
						},
						this.autoOpenChatOnMessage
					);
					debugLog('📬 [TrackingPixelSDK] ✅ Servicio de mensajes no leídos conectado tempranamente');
				}

				// 🟢 Inicializar servicio de presencia y typing indicators
				this.setupPresenceService();
				debugLog('🟢 [TrackingPixelSDK] ✅ Servicio de presencia configurado');

				// REGISTRO AUTOMÁTICO DE CONSENTIMIENTOS:
				// El backend ahora registra TODOS los consentimientos automáticamente en identify()
				// según el valor de hasAcceptedPrivacyPolicy enviado en el payload.
				// Ya NO es necesario registrar manualmente analytics, functional ni personalization.
				debugLog('[TrackingPixelSDK] ✅ Consentimientos registrados automáticamente por el backend en identify()');

				// Sincronizar estado de consentimiento con el backend SOLO para visitantes recurrentes
				// (cuando el consentimiento local tiene más de 5 segundos)
				if (this.consentManager.isGranted()) {
					try {
						const currentState = this.consentManager.getState();
						const consentAge = Date.now() - currentState.timestamp;

						// Solo sincronizar si el consentimiento es antiguo (visitante recurrente)
						// Para consentimientos recientes (< 5s), el backend ya los tiene del identify()
						if (consentAge > 5000) {
							debugLog('[TrackingPixelSDK] 🔄 Sincronizando con backend (visitante recurrente, consentimiento antiguo)...');
							const backendState = await this.consentBackendService.syncWithBackend(result.identity.visitorId);
							debugLog('[TrackingPixelSDK] 🔄 Estado de consentimiento sincronizado con backend:', backendState);

							// Actualizar el estado local si el backend tiene información diferente
							if (currentState.preferences) {
								const hasChanges =
									currentState.preferences.analytics !== backendState.analytics ||
									currentState.preferences.functional !== backendState.functional ||
									currentState.preferences.personalization !== backendState.personalization;

								if (hasChanges) {
									debugLog('[TrackingPixelSDK] 🔄 Actualizando preferencias locales con estado del backend');
									this.consentManager.grantConsentWithPreferences(backendState);
								}
							}
						} else {
							debugLog('[TrackingPixelSDK] ⏭️ Saltando sincronización: consentimiento recién otorgado (edad: ' + Math.round(consentAge / 1000) + 's)');
							debugLog('[TrackingPixelSDK] 📝 El backend ya tiene los consentimientos del identify() actual');
						}
					} catch (error) {
					}
				}

				// Los chats ya se cargan automáticamente en identitySignal.identify()
				const openStatuses = new Set(['PENDING', 'ASSIGNED', 'ACTIVE']);
				const openChat = result.chats?.chats?.find((c) =>
					openStatuses.has(String(c.status || '').toUpperCase())
				);
				const hasExistingChats = !!(result.chats?.chats && result.chats.chats.length > 0);

				if (openChat?.id) {
					localStorage.setItem('guiders_recent_chats', JSON.stringify(result.chats!.chats));
					ChatSessionStore.getInstance().setCurrent(openChat.id);
					if (this.chatUI) {
						this.chatUI.setChatId(openChat.id);
						this.chatUI.setActiveChatForUnread(openChat.id);
					}
					debugLog('[TrackingPixelSDK] ♻️ Chat abierto reutilizado:', openChat.id, openChat.status);
				} else if (hasExistingChats && result.chats) {
					localStorage.setItem('guiders_recent_chats', JSON.stringify(result.chats.chats));
					ChatSessionStore.getInstance().setCurrent(result.chats.chats![0].id);
					debugLog('[TrackingPixelSDK] ♻️ Chat reciente (cerrado) en store:', result.chats.chats![0].id);
				} else {
					debugLog('[TrackingPixelSDK] 💬 No hay chats previos, mostrando mensaje de bienvenida automáticamente');
					if (this.chatUI && this.chatUI.checkAndAddInitialMessages) {
						setTimeout(() => {
							if (this.chatUI && this.chatUI.checkAndAddInitialMessages) {
								this.chatUI.checkAndAddInitialMessages();
								debugLog('[TrackingPixelSDK] ✅ Mensaje de bienvenida mostrado automáticamente');
							}
						}, 500);
					}
				}

				// 📡 Inicializar WebSocket SIEMPRE para recibir notificaciones proactivas
				debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: Verificando condiciones WebSocket:', {
					hasChatUI: !!this.chatUI,
					isConnected: this.wsService.isConnected(),
					visitorId: this.getVisitorId()?.substring(0, 8) + '...'
				});

				if (this.chatUI && !this.wsService.isConnected()) {
					debugLog('📡 [TrackingPixelSDK] 🚀 Inicializando WebSocket para notificaciones en tiempo real');
					this.initializeWebSocketConnection(this.chatUI);
				}

				const activeChatId =
					openChat?.id ||
					(this.chatUI?.getChatId?.() ?? ChatSessionStore.getInstance().getCurrent());
				if (activeChatId) {
					this.realtimeMessageManager.setCurrentChat(activeChatId);
					if (this.wsService.isConnected()) {
						this.wsService.joinChatRoom(activeChatId);
					}
					debugLog('📡 [TrackingPixelSDK] ✅ WebSocket room para chat:', activeChatId);
				} else {
					debugLog('📡 [TrackingPixelSDK] ✅ WebSocket listo; creando PENDING de entrada al sitio…');
				}

				// Al entrar en la web: asegurar chat PENDING → Console Pendientes
				await this.ensureSiteEntryPendingChat(!!openChat);
			}
		} catch (e) {
			// No resetear el flag si es una operación cancelada
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (!errorMessage.includes('Operation was superseded')) {
				// Resetear flag para permitir reintento en caso de error real
				this.identifyExecuted = false;
			} else {
				debugLog('[TrackingPixelSDK] ℹ️ identify cancelado por operación más reciente');
			}
		}
	}

	/**
	 * Configura listeners simplificados para detectar cuando se cierra la ventana/pestaña.
	 * Ejecuta /endSession únicamente cuando se cierra la ventana.
	 * Incluye detección de refresh para evitar desconexiones falsas.
	 */
	private setupPageUnloadHandlers(): void {
		if (typeof window === 'undefined') return;

		// Flag para evitar múltiples llamadas a endSession
		let sessionEndCalled = false;

		// Constante para período de gracia de refresh (3 segundos)
		const REFRESH_GRACE_PERIOD_MS = 3000;

		// Detectar si esta página se cargó como refresh usando Navigation API
		let isPageRefresh = false;
		try {
			const navEntries = performance.getEntriesByType('navigation');
			if (navEntries.length > 0) {
				const navEntry = navEntries[0] as PerformanceNavigationTiming;
				isPageRefresh = navEntry.type === 'reload';
			}
		} catch (e) {
			// Fallback para navegadores antiguos
		}

		// Verificar si esta carga es un refresh rápido (dentro del período de gracia)
		const lastUnloadTime = sessionStorage.getItem('guiders_last_unload_time');
		if (lastUnloadTime) {
			const timeSinceUnload = Date.now() - parseInt(lastUnloadTime, 10);
			if (timeSinceUnload < REFRESH_GRACE_PERIOD_MS || isPageRefresh) {
				debugLog(`[TrackingPixelSDK] 🔄 Refresh rápido detectado (${timeSinceUnload}ms, isReload=${isPageRefresh}) - reanudando sesión`);
				// Marcar como refresh para que el próximo endSession lo sepa
				sessionStorage.setItem('guiders_is_refresh', 'true');
			} else {
				sessionStorage.removeItem('guiders_is_refresh');
			}
			// Limpiar timestamp de unload
			sessionStorage.removeItem('guiders_last_unload_time');
		} else if (isPageRefresh) {
			// Es un refresh pero no tenemos timestamp (primera vez o sesión expirada)
			debugLog(`[TrackingPixelSDK] 🔄 Página cargada como refresh - configurando flag`);
			sessionStorage.setItem('guiders_is_refresh', 'true');
		}

		const endSessionOnce = (reason: string) => {
			if (sessionEndCalled) return;
			sessionEndCalled = true;

			try {
				// Guardar timestamp de unload para detectar refresh rápido
				sessionStorage.setItem('guiders_last_unload_time', Date.now().toString());

				debugLog(`[TrackingPixelSDK] 🚪 Finalizando sesión por: ${reason}`);

				// 1. Flush eventos pendientes si los hay
				if (this.eventQueue.length > 0) {
					const eventsToSend = [...this.eventQueue];
					this.eventQueue = [];

					if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
						try {
							const endpoint = EndpointManager.getInstance().getEndpoint();
							const apiRoot = endpoint.endsWith('/api') ? endpoint : `${endpoint}/api`;
							const url = `${apiRoot}/tracking/events/batch`;
							const blob = new Blob([JSON.stringify(eventsToSend)], { type: 'application/json' });
							// navigator.sendBeacon is not typed in strict TS lib — cast is intentional
							(navigator as unknown as { sendBeacon(url: string, data: Blob): boolean }).sendBeacon(url, blob);
							debugLog(`[TrackingPixelSDK] 📤 ${eventsToSend.length} eventos enviados via beacon`);
						} catch (e) {
						}
					}
				}

				// 2. Finalizar sesión backend usando beacon
				// NOTA: endSession ahora verifica internamente si es un refresh
				VisitorsV2Service.getInstance().endSession({ useBeacon: true });

			} catch (e) {
			}
		};

		// Solo usar beforeunload y pagehide que son los más confiables para cierre de ventana
		debugLog('[TrackingPixelSDK] 🚪 Configurando listeners simplificados para cierre de ventana');

		// Evento principal: beforeunload - cuando la página está a punto de descargarse
		window.addEventListener('beforeunload', () => {
			debugLog('[TrackingPixelSDK] 🚪 beforeunload detectado');

			// Tracking V2: Persistir cola y enviar con sendBeacon
			if (this.trackingV2Enabled && this.eventQueueManager && this.trackingV2Service) {
				// 1. Guardar cola en localStorage
				this.eventQueueManager.saveToStorage();
				debugLog('[TrackingPixelSDK] 💾 Cola de eventos guardada en localStorage');

				// 2. Enviar eventos pendientes con sendBeacon
				const pendingEvents = this.eventQueueManager.getBatch(500);
				if (pendingEvents.length > 0) {
					const success = this.trackingV2Service.sendBatchWithBeacon(pendingEvents);
					if (success) {
						debugLog(`[TrackingPixelSDK] 📤 ${pendingEvents.length} eventos enviados con sendBeacon`);
					}
				}
			}

			endSessionOnce('window_close');
		});

		// Evento secundario: pagehide - más confiable que beforeunload en móviles
		window.addEventListener('pagehide', () => {
			debugLog('[TrackingPixelSDK] 🚪 pagehide detectado');

			// Tracking V2: Backup en pagehide (para móviles)
			if (this.trackingV2Enabled && this.eventQueueManager) {
				this.eventQueueManager.saveToStorage();
			}

			endSessionOnce('window_close');
		});
	}

	private configureTypingIndicators(chat: ChatUI): void {
		debugLog("💬 Indicadores de escritura desactivados (sin WebSocket)");
	}

	public on(type: string, listener: (msg: PixelEvent) => void): void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)?.add(listener);
	}

	public off(type: string, listener: (msg: PixelEvent) => void): void {
		this.listeners.get(type)?.delete(listener);
	}

	public once(type: string, listener: (msg: PixelEvent) => void): void {
		const wrappedListener = (msg: PixelEvent) => {
			listener(msg);
			this.off(type, wrappedListener);
		};
		this.on(type, wrappedListener);
	}

	public addPipelineStage(stage: PipelineStage): void {
		this.eventPipeline = this.pipelineBuilder
			.addStage(stage)
			.build();
	}

	/**
	 * Habilita el tracking de eventos del DOM.
	 * Usa detección heurística automática si está habilitada, sino el sistema legacy.
	 */
	public enableDOMTracking(): void {
		if (this.domTrackingManager instanceof EnhancedDomTrackingManager) {
			debugLog('[TrackingPixelSDK] 🎯 Enabling automatic heuristic tracking');
			this.domTrackingManager.enableAutomaticTracking();
		} else {
			debugLog('[TrackingPixelSDK] Enabling legacy DOM tracking');
			this.domTrackingManager.enableDOMTracking();
		}
	}

	/**
	 * Enable automatic heuristic tracking (new preferred method)
	 */
	public enableAutomaticTracking(): void {
		if (this.domTrackingManager instanceof EnhancedDomTrackingManager) {
			this.domTrackingManager.enableAutomaticTracking();
		} else {
			this.domTrackingManager.enableDOMTracking();
		}
	}

	/**
	 * Get heuristic detection configuration (if available)
	 */
	public getHeuristicConfig(): HeuristicDetectionConfig | null {
		if (this.domTrackingManager instanceof EnhancedDomTrackingManager) {
			return this.domTrackingManager.getHeuristicConfig();
		}
		return null;
	}

	/**
	 * Update heuristic detection configuration (if available)
	 */
	public updateHeuristicConfig(config: Partial<HeuristicDetectionConfig>): void {
		if (this.domTrackingManager instanceof EnhancedDomTrackingManager) {
			this.domTrackingManager.updateHeuristicConfig(config);
		} else {
		}
	}

	/**
	 * Enable or disable heuristic detection (if available)
	 */
	public setHeuristicEnabled(enabled: boolean): void {
		if (this.domTrackingManager instanceof EnhancedDomTrackingManager) {
			this.domTrackingManager.setHeuristicEnabled(enabled);
		} else {
		}
	}

	/**
	 * Update active hours configuration dynamically
	 */
	public updateActiveHoursConfig(config: ActiveHoursConfig): void {
		try {
			this.activeHoursValidator = new ActiveHoursValidator(config);
			debugLog('[TrackingPixelSDK] 🕐 Configuración de horarios activos actualizada:', {
				enabled: config.enabled,
				timezone: config.timezone,
				ranges: config.ranges?.length || 0,
				fallbackMessage: config.fallbackMessage ? 'Configurado' : 'No configurado'
			});

			// Re-evaluar estado del chat 
			const isActive = this.activeHoursValidator.isChatActive();
			if (!isActive && config.fallbackMessage) {
				debugLog('[TrackingPixelSDK] 🕐 Chat fuera de horario activo, aplicando mensaje de fallback');
				// Aquí podrías emitir un evento o actualizar la UI según sea necesario
			}
		} catch (error) {
		}
	}

	/**
	 * Get current active hours configuration
	 */
	public getActiveHoursConfig(): ActiveHoursConfig | null {
		return this.activeHoursValidator?.getConfig() || null;
	}

	/**
	 * Enable session tracking
	 */
	public enableSessionTracking(): void {
		if (this.sessionTrackingManager) {
			debugLog('[TrackingPixelSDK] 🎯 Session tracking already enabled and initialized');
		} else {
		}
	}

	public setMetadata(event: string, metadata: Record<string, unknown>): void {
		const eventIndex = this.eventQueue.findIndex((e) => e.type === event);
		if (eventIndex === -1) {
			return;
		}

		this.eventQueue[eventIndex].metadata = metadata;
	}

	public async flush(): Promise<void> {
		// Usar Tracking V2 si está habilitado
		if (this.trackingV2Enabled && this.eventQueueManager && this.trackingV2Service) {
			// NUEVO: Flushear agregador primero (si está habilitado)
			if (this.eventAggregator && this.eventAggregator.isEnabled()) {
				const aggregatedEvents = this.eventAggregator.flush();
				// Encolar eventos agregados para envío
				aggregatedEvents.forEach(event => {
					this.eventQueueManager!.enqueue(event);
				});

				if (aggregatedEvents.length > 0) {
					debugLog(`[TrackingPixelSDK] 🔗 ${aggregatedEvents.length} eventos agregados añadidos a la cola`);
				}
			}

			// 📊 Obtener estadísticas de la cola antes de enviar
			const stats = this.eventQueueManager.getStats();
			debugLog('[TrackingPixelSDK] 📊 Estadísticas de cola:', {
				queueSize: stats.size,
				maxSize: stats.maxSize,
				utilizationPercent: `${((stats.size / stats.maxSize) * 100).toFixed(1)}%`,
				ttlHours: stats.ttlHours,
				oldestEventAgeHours: stats.oldestEventAgeHours ?? 'N/A'
			});

			if (this.eventQueueManager.isEmpty()) {
				debugLog('[TrackingPixelSDK] 📭 No hay eventos para enviar (V2)');
				return;
			}

			const batch = this.eventQueueManager.getBatch(500);
			if (batch.length === 0) return;

			debugLog(`[TrackingPixelSDK] 📤 Enviando batch de ${batch.length} eventos (V2)...`);

			try {
				const result = await this.trackingV2Service.sendBatch(batch);
				if (result && result.success) {
					// Eliminar eventos enviados exitosamente de la cola
					this.eventQueueManager.dequeue(batch.length);
					debugLog(`[TrackingPixelSDK] ✅ ${result.processed} eventos procesados, ${result.discarded} descartados`);
				} else {
				}
			} catch (error) {
				// Los eventos permanecen en la cola para reintentar más tarde
			}
		} else {
			// Fallback a sistema tradicional
			if (this.eventQueue.length === 0) return;

			const eventsToSend = [...this.eventQueue];
			this.eventQueue = [];

			await Promise.all(
				eventsToSend.map((event) => this.trySendEventWithRetry(event, this.maxRetries))
			);
		}
	}

	public stopAutoFlush(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
	}

	public async track(params: Record<string, unknown>): Promise<void> {
		return new Promise((resolve, reject) => {
			// Verificar consentimiento antes de hacer tracking
			if (!this.consentManager.isTrackingAllowed()) {
				debugLog('[TrackingPixelSDK] 🔐 Tracking bloqueado - sin consentimiento');
				resolve(); // No rechazar, solo ignorar silenciosamente
				return;
			}

			const { event, ...data } = params;
			if (typeof event !== "string") {
				reject(new Error("El evento debe tener un tipo."));
				return;
			}
			try {
				this.captureEvent('tracking:tracking-event', {
					trackingEventId: uuidv4(),
					metadata: {
						...data,
					},
					eventType: event,
				});
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Legacy compatibility wrapper for trackEvent()
	 * @deprecated Use track() instead. This method exists for WordPress plugin compatibility.
	 */
	public async trackEvent(eventType: string, data?: Record<string, unknown>): Promise<void> {
		return this.track({ event: eventType, ...data });
	}

	private captureEvent(type: string, data: Record<string, unknown>): void {
		// Verificar consentimiento antes de capturar eventos (a menos que esté en modo bypass)
		if (!this.bypassConsentForTracking) {
			if (!this.consentManager.isTrackingAllowed()) {
				debugLog('[TrackingPixelSDK] 🔐 Evento bloqueado - sin consentimiento:', type);
				return;
			}

			// Verificar si analytics está permitido para eventos de tracking
			if (!this.consentManager.isCategoryAllowed('analytics')) {
				debugLog('[TrackingPixelSDK] 🔐 Evento bloqueado - analytics no permitido:', type);
				return;
			}
		}

		const rawEvent = {
			type,
			data,
			timestamp: Date.now(),
		};
		const processedEvent = this.eventPipeline.process(rawEvent);

		// Usar EventQueueManager si Tracking V2 está habilitado
		if (this.trackingV2Enabled && this.eventQueueManager) {
			// El evento ya fue transformado a TrackingEventDto por el pipeline
			const trackingEvent = processedEvent.data as unknown as TrackingEventDto;

			// NUEVO: Aplicar throttling
			if (this.eventThrottler && !this.eventThrottler.shouldAllow(trackingEvent.eventType)) {
				// Evento throttled, descartar silenciosamente
				return;
			}

			// NUEVO: Añadir al agregador (si está habilitado)
			if (this.eventAggregator && this.eventAggregator.isEnabled()) {
				// El agregador acumulará eventos y los enviará en su flush automático
				this.eventAggregator.add(trackingEvent);
			} else {
				// Sin agregación: encolar directamente
				this.eventQueueManager.enqueue(trackingEvent);
			}
		} else {
			// Fallback a cola tradicional
			this.eventQueue.push(processedEvent);
		}
	}

	private async trySendEventWithRetry(event: PixelEvent, retriesLeft: number): Promise<void> {
		try {
			// Sin WebSocket, usar HTTP como fallback
			debugLog("📡 Enviando evento via HTTP (sin WebSocket):", event.type);
		} catch (error) {
			if (retriesLeft > 0) {
				setTimeout(() => {
					this.trySendEventWithRetry(event, retriesLeft - 1);
				}, 1000); // 1 segundo entre intentos
			} else {
			}
		}
	}

	private startAutoFlush(): void {
		if (this.flushTimer) clearInterval(this.flushTimer);
		this.flushTimer = setInterval(() => {
			this.flush();
		}, this.flushInterval);
	}

	private dispatchMessage(message: PixelEvent): void {
		const listeners = this.listeners.get(message.type);
		
		// Incrementar contador de mensajes no leídos si es un mensaje de chat
		// Esta es la ubicación centralizada para incrementar el contador
		if (message.type === "receive-message") {
			debugLog("💬 Mensaje recibido (sin servicio de mensajes no leídos)");
			// Notificación del navegador si está permitido
			if (typeof window !== "undefined" && "Notification" in window) {
				const notifBody = (message.data && typeof message.data.message === 'string' && message.data.message)
					? message.data.message
					: "Tienes un nuevo mensaje en el chat";
				if (Notification.permission === "granted") {
					new Notification("Nuevo mensaje", {
						body: notifBody,
						icon: "/favicon.ico"
					});
				} else if (Notification.permission !== "denied") {
					Notification.requestPermission().then(permission => {
						if (permission === "granted") {
							new Notification("Nuevo mensaje", {
								body: notifBody,
								icon: "/favicon.ico"
							});
						}
					});
				}
			}
		}

		// Si no hay listeners, no continuamos
		if (!listeners || listeners.size === 0) return;

		listeners.forEach((listener) => {
			try {
				listener(message);
			} catch (error) {
			}
		});
	}

	/**
	 * Cleanup all resources and event listeners
	 */
	public cleanup(): void {
		// Intentar cerrar sesión backend explícitamente (sin beacon, llamada normal)
		VisitorsV2Service.getInstance().endSession().catch(() => {
			/* silencio: ya logueado en servicio */
		});

		// Stop auto flush
		this.stopAutoFlush();

		// Clear event queue
		this.eventQueue = [];

		// Clear listeners
		this.listeners.clear();

		// Cleanup commercial availability service
		if (this.commercialAvailabilityService) {
			this.commercialAvailabilityService.cleanup();
			this.commercialAvailabilityService = null;
			debugLog('[TrackingPixelSDK] 📡 CommercialAvailabilityService limpiado');
		}

		// Cleanup presence service (includes stopping heartbeat)
		this.presenceManager?.cleanup();

		debugLog('[TrackingPixelSDK] Cleanup completed');
	}

	/**
	 * Configura los listeners para eventos de participantes (estado online y nuevos participantes)
	 * @param chat Instancia del ChatUI (también expone la API de toggle)
	 */
	private setupParticipantEventsListener(chat: ChatUI): void {
		debugLog("💬 Eventos de participantes desactivados (sin WebSocket)");
	}

	/**
	 * Verifica el estado de los comerciales y actualiza la visibilidad del chat
	 * @param chatId ID del chat
	 * @param chat Instancia del ChatUI (también expone la API de toggle)
	 */
	private async checkAndUpdateChatVisibility(chatId: string, chat: ChatUI): Promise<void> {
		try {
			debugLog(`🔍 checkAndUpdateChatVisibility - Verificando chat ${chatId}`);
			
			// Obtener los detalles actualizados del chat
			const chatDetail = await this.fetchChatDetail(chatId);
			
			debugLog(`📋 Detalles del chat obtenidos:`, {
				totalParticipants: chatDetail.participants.length,
				participants: chatDetail.participants.map((p: ChatParticipant) => ({
					name: p.name,
					isCommercial: p.isCommercial,
					isOnline: p.isOnline,
					id: p.id
				}))
			});
			
			// Filtrar solo los comerciales
			const commercials = chatDetail.participants.filter((p: ChatParticipant) => p.isCommercial);
			
			debugLog(`🏪 Comerciales encontrados: ${commercials.length}`, 
				commercials.map((c: ChatParticipant) => ({
					name: c.name,
					isOnline: c.isOnline,
					id: c.id
				}))
			);
			
			// Verificar si hay al menos un comercial online
			const hasOnlineCommercial = commercials.some((commercial: ChatParticipant) => commercial.isOnline);
			const onlineCommercials = commercials.filter((c: ChatParticipant) => c.isOnline);
			
			debugLog("📊 Resumen de comerciales:");
			debugLog(`  - Total comerciales: ${commercials.length}`);
			debugLog(`  - Comerciales online: ${onlineCommercials.length}`);
			debugLog(`  - ¿Hay al menos un comercial online? ${hasOnlineCommercial}`);
			debugLog(`  - Estado actual del botón: ${chat.isButtonVisible()}`);

			// Mostrar siempre el botón del chat, sin importar la disponibilidad de comerciales
			chat.showToggleButton();

		} catch (error) {
			if (error instanceof Error) {
			}
		}
	}

	/**
	 * Inicializa el servicio de disponibilidad de comerciales (endpoint API v2)
	 * @param chat Instancia del ChatUI (también expone la API de toggle)
	 */
	private initializeCommercialAvailability(chat: ChatUI): void {
		// Solo inicializar si la configuración está habilitada
		if (!this.commercialAvailabilityConfig?.enabled) {
			// El código llamador se encargará de mostrar el botón si es necesario
			return;
		}

		const domain = window.location.hostname;
		// tenantId may already be stored from a previous identify/session
		const storedTenantId = localStorage.getItem('tenantId') || undefined;

		// Create availability service (REST + WebSocket, no polling)
		this.commercialAvailabilityService = new CommercialAvailabilityService({
			domain,
			apiKey: this.apiKey,
			apiBaseUrl: this.endpoint,
			debug: this.commercialAvailabilityConfig.debug || false,
			tenantId: storedTenantId
		});

		// Register callback for availability changes
		// hideWhenUnavailable (default true): oculta el widget si no hay soporte.
		// El estado se comunica en la cabecera del chat (no con mensajes de sistema).
		const hideWhenUnavailable =
			this.commercialAvailabilityConfig?.hideWhenUnavailable !== false;

		this.commercialAvailabilityService.onAvailabilityChanged((available, count) => {
			debugLog(`📡 [CommercialAvailability] Estado cambió: ${available} (${count} online)`);

			// Sincronizar presencia in-chat (header / banner) con disponibilidad tenant
			const presenceSvc = this.presenceManager?.getService();
			// Limpiar avisos de disponibilidad del hilo (evitan confusión con la cabecera)
			chat.clearAvailabilitySystemMessages();
			if (available && count >= 1) {
				presenceSvc?.applyCommercialStatus?.('online');
				chat.showToggleButton();
				if (this.commercialAvailabilityConfig?.showBadge) {
					chat.updateUnreadCount(count);
				}
			} else {
				presenceSvc?.applyCommercialStatus?.('offline');
				chat.hideUnreadBadge();
				if (hideWhenUnavailable) {
					debugLog(
						'📡 [CommercialAvailability] Sin soporte — ocultando chat'
					);
					if (chat.isVisible()) {
						chat.hide();
					}
					chat.hideToggleButton();
				} else {
					chat.showToggleButton();
				}
			}
		});
		// Start: REST initial check + WebSocket subscription
		this.commercialAvailabilityService.start().then(() => {
			debugLog('📡 [CommercialAvailability] Servicio iniciado (REST + WS)');
		}).catch((err) => {
			debugLog('📡 [CommercialAvailability] ⚠️ Error al iniciar servicio:', err);
		});
	}

	/**
	 * Verifica la disponibilidad de comerciales y muestra/oculta el botón del chat según corresponda
	 * @param chat Instancia del ChatUI (también expone la API de toggle)
	 * @deprecated Usar initializeCommercialAvailability() que utiliza el endpoint /v2/commercials/availability
	 */
	private async checkCommercialAvailability(chat: ChatUI): Promise<void> {
		try {
			// Esperar a que el chat tenga un ID asignado
			let chatId = chat.getChatId();
			let attempts = 0;
			const maxAttempts = 10;

			// Esperar hasta que el chat tenga un ID o se agoten los intentos
			while (!chatId && attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms
				chatId = chat.getChatId();
				attempts++;
				debugLog(`Esperando chat ID... intento ${attempts}/${maxAttempts}`);
			}

		if (!chatId) {
			// Mostrar el botón de todas formas para permitir al usuario intentar abrir el chat
			debugLog("🔘 Mostrando botón de chat sin verificación de comerciales");
			chat.showToggleButton();
			return;
		}			debugLog(`Verificando disponibilidad de comerciales para el chat ${chatId}...`);
			
			// Obtener los detalles del chat
			const chatDetail = await this.fetchChatDetail(chatId);
			
			// Filtrar solo los comerciales
			const commercials = chatDetail.participants.filter((participant: ChatParticipant) => participant.isCommercial);
			
			// Verificar si hay al menos un comercial online (no solo presente, sino también online)
			const hasOnlineCommercial = commercials.some((commercial: ChatParticipant) => commercial.isOnline);
			
			debugLog("Participantes del chat:", chatDetail.participants);
			debugLog("Comerciales en el chat:", commercials.length);
			debugLog("Comerciales online:", commercials.filter((c: ChatParticipant) => c.isOnline).length);
			debugLog("¿Hay comerciales online?", hasOnlineCommercial);
			
			// Mostrar siempre el botón del chat, sin importar la disponibilidad de comerciales
			chat.showToggleButton();
		} catch (error) {
			// Mostrar el botón de todas formas para permitir al usuario acceder al chat
			debugLog("🔘 Mostrando botón de chat a pesar del error en verificación");
			chat.showToggleButton();
		}
	}

	/**
	 * Método auxiliar para obtener los detalles del chat usando la API V2
	 * @param chatId ID del chat
	 * @returns Detalles del chat con participantes
	 */
	private async fetchChatDetail(chatId: string): Promise<ChatDetail> {
		if (!chatId) {
			throw new Error('chatId requerido');
		}
		debugLog(`🌐 fetchChatDetail - Obteniendo detalles para chat ${chatId} (usando API V2)`);
		
		try {
			// Intentar primero con la API V2 (optimizada)
			const chatDetailV2 = await fetchChatDetailV2(chatId);
			debugLog(`🌐 fetchChatDetail - Detalles V2 obtenidos:`, {
				id: chatDetailV2.id,
				status: chatDetailV2.status,
				visitorId: chatDetailV2.visitorId,
				assignedCommercialId: chatDetailV2.assignedCommercialId,
				availableCommercialIds: chatDetailV2.availableCommercialIds,
				isActive: chatDetailV2.isActive
			});
			
			// Convertir al formato legacy para compatibilidad
			const legacyDetail = this.convertV2ToLegacyDetail(chatDetailV2);
			
			debugLog(`🌐 fetchChatDetail - Convertido a formato legacy:`, {
				id: legacyDetail.id,
				participantsCount: legacyDetail.participants.length,
				participants: legacyDetail.participants.map(p => ({
					id: p.id,
					name: p.name,
					isCommercial: p.isCommercial,
					isOnline: p.isOnline
				}))
			});
			
			return legacyDetail;
		} catch (error) {
			
			// Fallback a la función legacy
			return await fetchChatDetail(chatId);
		}
	}

	/**
	 * Convierte los detalles del chat V2 al formato legacy
	 * @param chatDetailV2 Detalles del chat en formato V2
	 * @returns Detalles del chat en formato legacy
	 */
	private convertV2ToLegacyDetail(chatDetailV2: ChatDetailV2): ChatDetail {
		const participants: ChatParticipant[] = [];
		
		// Añadir el visitante como participante
		participants.push({
			id: chatDetailV2.visitorInfo.id,
			name: chatDetailV2.visitorInfo.name,
			isCommercial: false,
			isVisitor: true,
			isOnline: true, // Asumimos que el visitante está online si el chat está activo
			assignedAt: chatDetailV2.createdAt.toISOString(),
			lastSeenAt: chatDetailV2.lastMessageDate?.toISOString() || null,
			isViewing: chatDetailV2.isActive,
			isTyping: false,
			isAnonymous: false
		});

		// Añadir comerciales asignados como participantes online
		if (chatDetailV2.assignedCommercialId) {
			// Usar el nombre real del comercial si está disponible, sino usar nombre genérico
			const commercialName = chatDetailV2.assignedCommercial?.name || `Comercial ${chatDetailV2.assignedCommercialId}`;

			participants.push({
				id: chatDetailV2.assignedCommercialId,
				name: commercialName,
				isCommercial: true,
				isVisitor: false,
				isOnline: chatDetailV2.isActive, // Si el chat está activo, asumimos que está online
				assignedAt: chatDetailV2.assignedAt?.toISOString() || chatDetailV2.createdAt.toISOString(),
				lastSeenAt: chatDetailV2.lastMessageDate?.toISOString() || null,
				isViewing: chatDetailV2.isActive,
				isTyping: false,
				isAnonymous: false
			});
		}

		// Añadir comerciales disponibles como participantes potencialmente online
		if (chatDetailV2.availableCommercialIds && chatDetailV2.availableCommercialIds.length > 0) {
			chatDetailV2.availableCommercialIds.forEach(commercialId => {
				// Solo añadir si no está ya asignado
				if (commercialId !== chatDetailV2.assignedCommercialId) {
					participants.push({
						id: commercialId,
						name: `Comercial ${commercialId}`,
						isCommercial: true,
						isVisitor: false,
						isOnline: true, // Los comerciales disponibles están considerados online
						assignedAt: chatDetailV2.createdAt.toISOString(),
						lastSeenAt: null,
						isViewing: false,
						isTyping: false,
						isAnonymous: false
					});
				}
			});
		}

		return {
			id: chatDetailV2.id,
			participants,
			status: chatDetailV2.status,
			lastMessage: null, // V2 no incluye el último mensaje directamente
			lastMessageAt: chatDetailV2.lastMessageDate?.toISOString() || null,
			createdAt: chatDetailV2.createdAt.toISOString()
		};
	}

	/**
	 * Getter para acceder al servicio de visitantes V2.
	 * Útil para testing y acceso directo a funcionalidades de sesión.
	 */
	public get visitorsService() {
		return VisitorsV2Service.getInstance();
	}

	/**
	 * Getter para acceder al signal de identity.
	 * Permite suscribirse a cambios en el estado de identificación y chats.
	 */
	public getIdentitySignal() {
		return this.identitySignal;
	}

	/**
	 * Ejecuta la identificación del visitante usando fingerprint y automáticamente carga sus chats.
	 * @param fingerprint Huella digital del visitante
	 * @param apiKey API Key opcional (si no se usa el del constructor)
	 * @returns Promise con los datos de identity y chats
	 */
	public async identifyVisitor(fingerprint?: string, apiKey?: string) {
		const fp = fingerprint || this.fingerprint || this.generateFingerprint();
		const key = apiKey || this.apiKey;

		debugLog('[TrackingPixelSDK] 🔍 Identificando visitante con fingerprint:', fp);

		try {
			// Obtener versión actual del ConsentManager
			const consentVersion = this.consentManager.getState().version;

			const result = await this.identitySignal.identify(fp, key, consentVersion);
			debugLog('[TrackingPixelSDK] ✅ Visitante identificado exitosamente:', result.identity.visitorId);
			return result;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Genera un nuevo fingerprint usando ClientJS.
	 * @returns string con el fingerprint generado
	 */
	private generateFingerprint(): string {
		const client = new ClientJS();
		const fingerprint = client.getFingerprint().toString();
		localStorage.setItem("fingerprint", fingerprint);
		this.fingerprint = fingerprint;
		return fingerprint;
	}

	/**
	 * Recarga los chats del visitante actual.
	 * @returns Promise con la lista de chats o null si no hay visitante identificado
	 */
	public async reloadVisitorChats() {
		debugLog('[TrackingPixelSDK] 🔄 Recargando chats del visitante...');
		return this.identitySignal.reloadChats();
	}

	/**
	 * Obtiene el estado actual del signal de identity.
	 * @returns Estado actual con loading, data y error
	 */
	public getIdentityState() {
		return this.identitySignal.getState();
	}

	/**
	 * Obtiene el visitorId actual del visitante identificado.
	 * @returns visitorId o null si no está identificado
	 */
	public getVisitorId() {
		return this.identitySignal.getVisitorId();
	}

	/**
	 * Verifica si hay un visitante identificado.
	 * @returns true si hay un visitante identificado
	 */
	public isVisitorIdentified() {
		return this.identitySignal.isIdentified();
	}

	/**
	 * Suscribe un callback para escuchar cambios en el estado de identity.
	 * @param callback Función que se ejecuta cuando cambia el estado
	 * @returns Función para cancelar la suscripción
	 */
	public subscribeToIdentityChanges(callback: (state: SignalState<IdentityWithChatsData>) => void) {
		return this.identitySignal.subscribe(callback);
	}

	/**
	 * Suscribe un callback para escuchar cambios específicamente en los chats.
	 * @param callback Función que se ejecuta cuando cambian los chats
	 * @returns Función para cancelar la suscripción
	 */
	public subscribeToChatChanges(callback: (state: SignalState<ChatListV2>) => void) {
		return this.identitySignal.getChatsSignal().subscribe(callback);
	}

	/**
	 * Muestra el chat UI.
	 */
	public showChat(): void {
		debugLog('[TrackingPixelSDK] 💬 Mostrando chat...');
		if (this.chatUI) {
			this.chatUI.show();
		} else {
		}
	}

	/**
	 * Oculta el chat UI.
	 */
	public hideChat(): void {
		debugLog('[TrackingPixelSDK] 💬 Ocultando chat...');
		if (this.chatUI) {
			this.chatUI.hide();
		}
	}

	/**
	 * Verifica si el chat UI está visible.
	 * @returns true si el chat está visible
	 */
	public isChatVisible(): boolean {
		return this.chatUI?.isVisible() || false;
	}

	/**
	 * Reinicia el chat cerrándolo y volviéndolo a abrir.
	 */
	public resetChat(): void {
		debugLog('[TrackingPixelSDK] 🔄 Reiniciando chat...');
		if (this.chatUI) {
			this.chatUI.hide();
			setTimeout(() => {
				if (this.chatUI) {
					this.chatUI.show();
				}
			}, 500);
		}
	}

	/**
	 * Carga los mensajes del chat cuando se abre por primera vez
	 * @param chat Instancia del ChatUI
	 * @param force Forzar recarga aunque sea el mismo chat
	 */
	private async loadChatMessagesOnOpen(chat: ChatUI, force: boolean = false): Promise<void> {
		chat.setLoadingInitialMessages(true);

		try {
			const chatId = chat.getChatId();
			if (!chatId) {
				debugLog('[TrackingPixelSDK] 💬 No hay chatId, omitiendo carga de mensajes');
				chat.checkAndAddInitialMessages?.();
				return;
			}

			debugLog('[TrackingPixelSDK] 💬 Cargando mensajes para chat:', chatId, 'force:', force);
			await chat.initializeChat(chatId, force);

			// 📡 Unirse a la sala del chat para recibir mensajes en tiempo real
			if (this.wsService.isConnected()) {
				debugLog('[TrackingPixelSDK] 📡 Uniéndose a sala de chat:', chatId);
				this.realtimeMessageManager.setCurrentChat(chatId);
				if (this.chatUI) {
					this.chatUI.setActiveChatForUnread(chatId);
				}
			} else {
				debugLog('[TrackingPixelSDK] ⚠️ WebSocket no conectado aún, setCurrentChat se llamará en onConnect');
			}

			// Verificar si mostrar mensaje de bienvenida
			chat.checkAndAddInitialMessages?.();

		} catch (error) {
			debugLog('[TrackingPixelSDK] ⚠️ Error cargando mensajes:', error);
			chat.checkAndAddInitialMessages?.();
		} finally {
			chat.setLoadingInitialMessages(false);
		}
	}

	/**
	 * Carga automáticamente los mensajes iniciales del primer chat en el array.
	 * Se utiliza cuando se identifica al visitante para preparar el historial.
	 * @param firstChat El primer chat del array de chats
	 */
	private async loadInitialMessagesFromFirstChat(firstChat: { id: string }): Promise<void> {
		try {
			if (!firstChat?.id) {
				debugLog('[TrackingPixelSDK] 📭 No hay ID en el primer chat, omitiendo carga inicial');
				return;
			}

			debugLog('[TrackingPixelSDK] 🔄 Cargando mensajes iniciales del chat:', firstChat.id);

			if (!this.chatUI) return;

			// Avoid duplicate loads
			if (this.chatUI.isChatInitialized(firstChat.id)) {
				debugLog('[TrackingPixelSDK] ✅ Chat ya inicializado, omitiendo carga duplicada');
				return;
			}
			if (this.chatUI.isLoadingMessages()) {
				debugLog('[TrackingPixelSDK] ⏳ Ya cargando mensajes, omitiendo carga duplicada');
				return;
			}

			await this.chatUI.initializeChat(firstChat.id);
			debugLog('[TrackingPixelSDK] ✅ Mensajes iniciales cargados');

		} catch (error) {
		}
	}

	// --- Métodos públicos para gestión de horarios activos ---

	/**
	 * Verifica si el chat está activo según los horarios configurados
	 */
	public isChatActive(): boolean {
		if (!this.activeHoursValidator) {
			return true; // Si no hay configuración de horarios, siempre está activo
		}
		return this.activeHoursValidator.isChatActive();
	}

	/**
	 * Obtiene el mensaje de fallback cuando el chat no está activo
	 */
	public getChatFallbackMessage(): string | null {
		if (!this.activeHoursValidator) {
			return null;
		}
		return this.activeHoursValidator.getFallbackMessage();
	}

	/**
	 * Obtiene información sobre el próximo horario disponible
	 */
	public getNextAvailableTime(): string | null {
		if (!this.activeHoursValidator) {
			return null;
		}
		return this.activeHoursValidator.getNextAvailableTime();
	}

	/**
	 * Actualiza la configuración de horarios activos dinámicamente
	 */
	public updateActiveHours(config: Partial<ActiveHoursConfig>): boolean {
		try {
			const activeHoursConfig: ActiveHoursConfig = {
				enabled: config.enabled ?? true,
				ranges: config.ranges || [],
				timezone: config.timezone,
				fallbackMessage: config.fallbackMessage
			};

			const configErrors = ActiveHoursValidator.validateConfig(activeHoursConfig);
			if (configErrors.length > 0) {
				return false;
			}

			this.activeHoursValidator = new ActiveHoursValidator(activeHoursConfig);
			debugLog('[TrackingPixelSDK] 🕐 ✅ Configuración de horarios activos actualizada');
			
			// Verificar estado actual y actualizar UI si es necesario
			this.checkAndUpdateChatAvailability();
			
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Desactiva completamente la validación de horarios activos
	 */
	public disableActiveHours(): void {
		this.activeHoursValidator = undefined;
		debugLog('[TrackingPixelSDK] 🕐 Validación de horarios activos desactivada');
		
		// Mostrar el chat si estaba oculto por horarios
		this.checkAndUpdateChatAvailability();
	}

	/**
	 * Verifica y actualiza la disponibilidad del chat según horarios actuales
	 */
	private checkAndUpdateChatAvailability(): void {
		if (!this.chatUI) {
			return;
		}

		const isActive = this.isChatActive();
		const toggleButtonEl = document.querySelector('.chat-toggle-button') as HTMLElement;

		if (isActive) {
			// Chat debe estar disponible
			if (toggleButtonEl) {
				toggleButtonEl.style.display = 'block';
			}
			debugLog('[TrackingPixelSDK] 🕐 ✅ Chat ahora disponible según horarios');
		} else {
			// Chat debe estar oculto
			if (toggleButtonEl) {
				toggleButtonEl.style.display = 'none';
			}
			
			// Cerrar chat si está abierto
			if (this.chatUI.isVisible && this.chatUI.isVisible()) {
				this.chatUI.hide();
			}
			
			const fallbackMessage = this.getChatFallbackMessage();
			const nextAvailable = this.getNextAvailableTime();
			
			let statusMessage = fallbackMessage || 'Chat no disponible en este momento';
			if (nextAvailable) {
				statusMessage += ` Próximo horario: ${nextAvailable}`;
			}
			
			debugLog('[TrackingPixelSDK] 🕐 ' + statusMessage);
		}
	}

	/**
	 * Tras identify: si no hay chat abierto, crea PENDING (Console → Pendientes).
	 * No abre el widget ni muestra mensaje de espera (eso va al primer mensaje del visitante).
	 */
	private async ensureSiteEntryPendingChat(hasOpenChat: boolean): Promise<void> {
		if (hasOpenChat || this.siteEntryPendingEnsured) {
			return;
		}
		this.siteEntryPendingEnsured = true;

		try {
			const existingId =
				this.chatUI?.getChatId?.() || ChatSessionStore.getInstance().getCurrent();
			if (existingId) {
				debugLog('[TrackingPixelSDK] ⏭️ PENDING omitido: ya hay chatId', existingId);
				return;
			}

			debugLog('[TrackingPixelSDK] 🆕 createChatAuto (site-entry) → cola Pendientes');
			const created = await ChatV2Service.getInstance().createChatAuto({
				metadata: {
					source: 'sdk-site-entry',
					department: 'general',
					initialUrl:
						typeof window !== 'undefined' ? window.location.href : undefined,
					userAgent:
						typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
				},
			});

			if (!created?.chatId) {
				debugLog('[TrackingPixelSDK] ⚠️ createChatAuto sin chatId');
				return;
			}

			ChatSessionStore.getInstance().setCurrent(created.chatId);
			if (this.chatUI) {
				this.chatUI.setChatId(created.chatId);
				this.chatUI.setActiveChatForUnread?.(created.chatId);
			}
			this.realtimeMessageManager.setCurrentChat(created.chatId);
			if (this.wsService.isConnected()) {
				this.wsService.joinChatRoom(created.chatId);
			}
			debugLog(
				'[TrackingPixelSDK] ✅ PENDING site-entry creado:',
				created.chatId,
				'posición',
				created.position
			);
		} catch (error) {
			// Permitir reintento en el siguiente identify real si falló la creación
			this.siteEntryPendingEnsured = false;
			debugLog('[TrackingPixelSDK] ❌ Error creando PENDING site-entry:', error);
		}
	}

	/**
	 * Mensaje de sistema una vez por chat tras el primer envío del visitante.
	 */
	private showVisitorWaitingMessageOnce(
		chat: { addSystemMessage?: (text: string) => void },
		chatId: string | undefined
	): void {
		if (!chatId || !chat.addSystemMessage) return;
		const key = `guiders_wait_msg_${chatId}`;
		try {
			if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) {
				return;
			}
			sessionStorage?.setItem(key, '1');
		} catch {
			// sessionStorage no disponible: mostrar igual (mejor UX que silenciar)
		}
		chat.addSystemMessage(
			'Hemos recibido tu mensaje. En breve te atenderemos.'
		);
	}

	// ========== Métodos WebSocket para Comunicación Bidireccional ==========

	/**
	 * Inicializa la conexión WebSocket para comunicación en tiempo real
	 * @param chat Instancia del ChatUI
	 */
	private initializeWebSocketConnection(chat: ChatUI): void {
		debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: initializeWebSocketConnection() LLAMADO');
		const visitorId = this.getVisitorId();

		debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: visitorId =', visitorId?.substring(0, 8) + '...');

		if (!visitorId) {
			return;
		}

		// 🔧 FIX: Siempre actualizar la referencia de ChatUI en el RMM
		// Esto evita que el RMM tenga una referencia desactualizada cuando se recrea el ChatUI
		this.realtimeMessageManager.setChatUI(chat);

		// Verificar si ya está conectado
		debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: Verificando si ya conectado:', this.wsService.isConnected());

		if (this.wsService.isConnected()) {
			debugLog('📡 [TrackingPixelSDK] ✅ WebSocket ya conectado (skip init)');

			// 🔧 FIX: Asegurar que RealtimeMessageManager esté inicializado
			// Incluso si el WebSocket ya está conectado, el RMM puede no estar inicializado
			if (!this.realtimeMessageManager.getVisitorId()) {
				debugLog('📡 [TrackingPixelSDK] 🔧 Inicializando RealtimeMessageManager (WS ya conectado)');
				this.realtimeMessageManager.initialize({
					chatUI: chat,
					visitorId: visitorId,
					enableTypingIndicators: true,
					aiConfig: this.aiConfig
				});
			}

			// Actualizar chat actual si cambió
			const currentChatId = chat.getChatId();
			if (currentChatId && this.realtimeMessageManager.getCurrentChatId() !== currentChatId) {
				this.realtimeMessageManager.setCurrentChat(currentChatId);
			}

			// 📬 Actualizar UnreadMessagesService con el chat actual
			if (this.chatUI && currentChatId) {
				this.chatUI.setActiveChatForUnread(currentChatId);
				debugLog('📬 [TrackingPixelSDK] ✅ UnreadMessagesService actualizado con chat:', currentChatId);
			}

			return;
		}

		debugLog('📡 [TrackingPixelSDK] 🚀 Inicializando conexión WebSocket...');

		try {
			// Obtener sessionId para autenticación
			const sessionId = sessionStorage.getItem('guiders_backend_session_id');
			debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: sessionId encontrado:', sessionId ? sessionId.substring(0, 8) + '...' : 'NO');

			// Configurar y conectar WebSocket
			debugLog('📡 [TrackingPixelSDK] 🔍 DEBUG: Llamando wsService.connect()...');
			this.wsService.connect(
				{
					sessionId: sessionId || undefined,
					// La URL se resuelve automáticamente en WebSocketService usando EndpointManager
				},
				{
					onConnect: () => {
						debugLog('📡 [TrackingPixelSDK] ✅ WebSocket conectado exitosamente');

						// Unirse a sala de visitante para notificaciones proactivas
						if (visitorId) {
							this.wsService.joinVisitorRoom(visitorId);
							debugLog('📡 [TrackingPixelSDK] 🚀 Unido a sala de visitante para notificaciones proactivas');
						}

						// ✅ Unirse a la sala del chat DESPUÉS de que el WebSocket esté conectado
						const currentChatId = chat.getChatId();
						if (currentChatId) {
							this.realtimeMessageManager.setCurrentChat(currentChatId);
							debugLog('📡 [TrackingPixelSDK] ✅ Unido a sala de chat:', currentChatId);
						}
					},
					onDisconnect: (reason) => {
						debugLog('📡 [TrackingPixelSDK] ⚠️ WebSocket desconectado:', reason);
					},
					onError: (error) => {
					},
					onChatCreated: (event) => {
						debugLog('📡 [TrackingPixelSDK] 🎉 Chat creado proactivamente por un comercial:', event);

						// Unirse automáticamente al nuevo chat
						this.wsService.joinChatRoom(event.chatId);
						this.realtimeMessageManager.setCurrentChat(event.chatId);

						// Actualizar ChatSessionStore con el nuevo chat
						ChatSessionStore.getInstance().setCurrent(event.chatId);

						// Actualizar servicio de mensajes no leídos
						if (this.chatUI) {
							this.chatUI.setActiveChatForUnread(event.chatId);
						}

						// Mostrar notificación al usuario
						this.showChatCreatedNotification(event);

						debugLog('📡 [TrackingPixelSDK] ✅ Configurado automáticamente para el nuevo chat:', event.chatId);
					}
				}
			);

			// Inicializar RealtimeMessageManager con ChatUI
			this.realtimeMessageManager.initialize({
				chatUI: chat,
				visitorId: visitorId,
				enableTypingIndicators: true,
				// 🤖 Pasar configuración de IA
				aiConfig: this.aiConfig
			});

			// NOTA: setCurrentChat se llama dentro del callback onConnect (línea 2346)
			// para asegurar que el WebSocket esté conectado antes de unirse a la sala

			// Inicializar servicio de mensajes no leídos con badge
			if (this.chatUI) {
				this.chatUI.connectUnreadService(
					visitorId,
					() => {
						// Callback para abrir el chat automáticamente al recibir un mensaje
						debugLog('📬 [TrackingPixelSDK] 🔓 Auto-abriendo chat por mensaje recibido');

						// 🔧 FIX: Verificar si el chat puede ser abierto automáticamente
						if (!this.chatUI!.canAutoOpen()) {
							debugLog('📬 [TrackingPixelSDK] ⛔ Auto-apertura cancelada - usuario cerró chat recientemente');
							return;
						}

						this.chatUI!.show();
					},
					this.autoOpenChatOnMessage
				);

				// Establecer chat activo si existe
				const chatId = chat.getChatId();
				if (chatId) {
					this.chatUI.setActiveChatForUnread(chatId);
				}

				debugLog('📬 [TrackingPixelSDK] ✅ Servicio de mensajes no leídos inicializado');
			}

			debugLog('📡 [TrackingPixelSDK] ✅ Sistema de mensajería en tiempo real inicializado');
		} catch (error) {
		}
	}

	/**
	 * Inicializa el servicio de presencia y typing indicators
	 * Debe llamarse después de identify() cuando tengamos visitorId
	 */
	private setupPresenceService(): void {
		debugLog('🟢 [TrackingPixelSDK] setupPresenceService() LLAMADO');

		const visitorId = this.getVisitorId();
		if (!visitorId) return;

		if (!this.presenceManager) {
			debugLog('🟢 [TrackingPixelSDK] ⚠️ PresenceManager not initialised yet — skipping');
			return;
		}

		this.presenceManager.setup(
			visitorId,
			this.chatUI ? (this.chatUI as unknown as PresenceChatUILike) : undefined
		);

		// Expose PresenceService instance to ChatUI bridge for usePresence hook
		const svc = this.presenceManager.getService();
		if (svc && this.chatUI) {
			this.chatUI.setPresenceService(svc);
		}
	}

	/**
	 * Envía un mensaje usando el sistema de tiempo real
	 * @param content Contenido del mensaje
	 * @param type Tipo de mensaje (default: 'text')
	 */
	public async sendRealtimeMessage(content: string, type: string = 'text'): Promise<void> {
		try {
			await this.realtimeMessageManager.sendMessage(content, type);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Muestra una notificación cuando un comercial crea un chat proactivamente
	 * @param event Evento de chat creado
	 */
	private showChatCreatedNotification(event: ChatCreatedEvent): void {
		try {
			// Solicitar permiso para notificaciones si es necesario
			if ('Notification' in window && Notification.permission === 'default') {
				Notification.requestPermission().then(permission => {
					if (permission === 'granted') {
						this.displayChatNotification(event);
					}
				});
			} else if ('Notification' in window && Notification.permission === 'granted') {
				this.displayChatNotification(event);
			}

			// Animar el botón del chat para llamar la atención
			if (this.chatUI) {
				const buttonElement = this.chatUI.getButtonElement();
				if (buttonElement) {
					buttonElement.classList.add('pulse-animation');
					setTimeout(() => {
						buttonElement.classList.remove('pulse-animation');
					}, 3000);
				}
			}

			debugLog('📡 [TrackingPixelSDK] 🔔 Notificación de nuevo chat mostrada');
		} catch (error) {
		}
	}

	/**
	 * Muestra la notificación del navegador
	 * @param event Evento de chat creado
	 */
	private displayChatNotification(event: ChatCreatedEvent): void {
		try {
			const notification = new Notification('¡Un comercial ha iniciado un chat!', {
				body: event.message || 'Tienes un nuevo mensaje esperándote',
				icon: '/chat-icon.png', // Puedes personalizar esto
				tag: event.chatId,
				requireInteraction: true // La notificación persiste hasta que el usuario interactúe
			});

			notification.onclick = () => {
				// Abrir el chat cuando el usuario haga clic en la notificación
				if (this.chatUI) {
					this.chatUI.show();
				}
				notification.close();
			};
		} catch (error) {
		}
	}

	/**
	 * Obtiene el estado de la conexión WebSocket
	 */
	public getWebSocketState(): string {
		return this.wsService.getState();
	}

	/**
	 * Verifica si WebSocket está conectado
	 */
	public isWebSocketConnected(): boolean {
		return this.wsService.isConnected();
	}

	/**
	 * Desconecta el WebSocket manualmente
	 */
	public disconnectWebSocket(): void {
		this.wsService.disconnect();
		this.realtimeMessageManager.cleanup();
		debugLog('📡 [TrackingPixelSDK] 🔌 WebSocket desconectado');
	}

	// ========== Métodos de Control de Consentimiento GDPR ==========

	/**
	 * Inicializa solo el chat UI sin tracking (modo sin consentimiento)
	 */
	private async initChatUIOnly(): Promise<void> {
		debugLog('[TrackingPixelSDK] 🔐 Inicializando solo chat UI (sin tracking)');

		// Inicializar solo los componentes del chat
		this.chatUI = new ChatUI({
			widget: true,
			chatConsentMessage: this.chatConsentMessageConfig,
			position: this.chatPositionConfig,
			mobileDetection: this.mobileDetectionConfig,
			quickActions: this.quickActionsConfig,
			// 🤖 Configuración de IA para renderizado de mensajes
			ai: this.aiConfig,
			// 📋 Configuración del selector de chats
			chatSelector: this.chatSelectorConfig,
		});

		// Configurar callbacks de Quick Actions
		this.setupQuickActionsCallbacks();

		const initChatOnly = () => {
			if (!this.chatUI) return;

			// Verificar horarios activos si están configurados
			if (this.activeHoursValidator && !this.activeHoursValidator.isChatActive()) {
				debugLog('[TrackingPixelSDK] 🕐 Chat no disponible según horarios');
				return;
			}

			const chat = this.chatUI;
			// ChatInputUI removed — onSubmit handled via bridge signal
			// Toggle button managed by Preact bridge (same ChatUI instance exposes toggle API)

			chat.init();
			chat.hide();
			
			chat.initToggleButton();

			// Inicializar servicio de disponibilidad de comerciales (API v2)
			this.initializeCommercialAvailability(chat);

			debugLog('[TrackingPixelSDK] ✅ Chat UI inicializado (sin tracking)');

			// Listener básico para abrir/cerrar chat (sin tracking)
			chat.onOpen(() => {
				debugLog('[TrackingPixelSDK] 💬 Chat abierto (sin tracking de eventos)');
			});

			chat.onClose(() => {
				debugLog('[TrackingPixelSDK] 💬 Chat cerrado (sin tracking de eventos)');
			});

			chat.onToggle((visible: boolean) => {
				if (visible) {
					chat.show();
				} else {
					chat.hide();
				}
			});

			// El envío de mensajes requiere consentimiento funcional al menos
			chat.onSubmit(async (message: string) => {
				if (!message) return;

				// Verificar si hay consentimiento funcional
				if (!this.consentManager.isCategoryAllowed('functional')) {
					chat.addSystemMessage('Se requiere aceptar cookies funcionales para enviar mensajes.');
					return;
				}

				// Si hay consentimiento funcional, proceder como normal
				try {
					const visitorId = this.getVisitorId();
					if (!visitorId) {
						await this.executeIdentify();
					}

					const currentChatId = chat.getChatId();
					if (currentChatId) {
						await ChatV2Service.getInstance().sendMessage(currentChatId, message, 'text');
						this.showVisitorWaitingMessageOnce(chat, currentChatId);
					} else {
						const result = await ChatV2Service.getInstance().createChatWithMessage(
							{},
							{ content: message, type: 'text' }
						);
						chat.setChatId(result.chatId);
						this.showVisitorWaitingMessageOnce(chat, result.chatId);
					}
				} catch (error) {
				}
			});
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initChatOnly);
		} else {
			initChatOnly();
		}
	}

	/**
	 * Detiene todas las actividades de tracking
	 */
	private stopTrackingActivities(): void {
		debugLog('[TrackingPixelSDK] 🛑 Deteniendo todas las actividades de tracking...');

		// Detener DOM tracking
		if (this.domTrackingManager) {
			// Los managers no tienen método público para detener, pero podemos limpiar
			debugLog('[TrackingPixelSDK] 🛑 DOM tracking detenido');
		}

		// Detener session tracking
		if (this.sessionTrackingManager) {
			// El session manager se detendrá automáticamente al no procesar nuevos eventos
			debugLog('[TrackingPixelSDK] 🛑 Session tracking detenido');
		}

		// Detener auto flush
		this.stopAutoFlush();

		// Limpiar cola de eventos
		this.eventQueue = [];

		debugLog('[TrackingPixelSDK] ✅ Todas las actividades de tracking detenidas');
	}

	/**
	 * Inicializa el banner de consentimiento integrado
	 */
	private initConsentBanner(config: ConsentBannerConfig): void {
		debugLog('[TrackingPixelSDK] 🎨 Inicializando banner de consentimiento...');

		const cleanup = this.chatUI?.showConsentBanner(config, {
			onAccept: () => {
				debugLog('[TrackingPixelSDK] ✅ Usuario aceptó desde banner');
				this.grantConsent();
				cleanup?.();
			},
			onDeny: () => {
				debugLog('[TrackingPixelSDK] ❌ Usuario rechazó desde banner');
				this.denyConsent();
				cleanup?.();
			},
			onPreferences: () => {
				debugLog('[TrackingPixelSDK] ⚙️ Usuario abrió preferencias desde banner');
				alert('Modal de preferencias: Próximamente.\n\nPor ahora, puedes:\n- Aceptar Todo = Otorgar consentimiento completo\n- Rechazar = Solo cookies esenciales');
			},
		});

		if (config.autoShow && this.consentManager.isPending()) {
			debugLog('[TrackingPixelSDK] 👁️ Banner mostrado automáticamente (consent pending)');
		}
	}

	/**
	 * Otorga consentimiento completo y reinicia el tracking
	 */
	public grantConsent(): void {
		debugLog('[TrackingPixelSDK] ✅ Otorgando consentimiento completo...');

		this.consentManager.grantConsent();

		// Nota: El consentimiento se registrará automáticamente en el backend
		// durante init() -> identify() con hasAcceptedPrivacyPolicy: true
		debugLog('[TrackingPixelSDK] 📝 El backend registrará el consentimiento automáticamente durante identify()');

		// Reiniciar el SDK con tracking habilitado
		debugLog('[TrackingPixelSDK] 🔄 Reiniciando SDK con tracking habilitado...');
		this.init().catch(error => {
		});
	}

	/**
	 * Otorga consentimiento con preferencias específicas
	 */
	public grantConsentWithPreferences(preferences: {
		analytics?: boolean;
		functional?: boolean;
		personalization?: boolean;
	}): void {
		debugLog('[TrackingPixelSDK] ✅ Otorgando consentimiento con preferencias:', preferences);

		this.consentManager.grantConsentWithPreferences(preferences);

		// Nota: El consentimiento se registrará automáticamente en el backend
		// durante init() -> identify() con hasAcceptedPrivacyPolicy: true
		debugLog('[TrackingPixelSDK] 📝 El backend registrará el consentimiento automáticamente durante identify()');

		// Reiniciar el SDK con tracking habilitado
		debugLog('[TrackingPixelSDK] 🔄 Reiniciando SDK...');
		this.init().catch(error => {
		});
	}

	/**
	 * Deniega el consentimiento y detiene el tracking
	 */
	public denyConsent(): void {
		debugLog('[TrackingPixelSDK] ❌ Denegando consentimiento...');

		this.consentManager.denyConsent();
		this.stopTrackingActivities();

		// IMPORTANTE: Registrar el rechazo en el backend para compliance GDPR
		// El backend necesita saber que el usuario rechazó explícitamente
		debugLog('[TrackingPixelSDK] 📝 Registrando rechazo de consentimiento en el backend...');

		// NO llamar a init() aquí porque init() asume consentimiento granted
		// y escribe en localStorage (violación GDPR si consent está denied)
		// En su lugar, llamar directamente a identitySignal.identify()
		// que leerá el estado 'denied' del ConsentManager desde localStorage

		// Generar fingerprint si no existe (sin escribir en localStorage todavía)
		const client = new ClientJS();
		const fingerprint = this.fingerprint || client.getFingerprint().toString();

		// Obtener versión actual del ConsentManager
		const consentVersion = this.consentManager.getState().version;

		this.identitySignal.identify(fingerprint, this.apiKey, consentVersion).catch(error => {
			// No es un error crítico - el usuario ya tiene acceso limitado localmente
		});
	}

	/**
	 * Revoca el consentimiento previamente otorgado
	 */
	public revokeConsent(): void {
		debugLog('[TrackingPixelSDK] 🔄 Revocando consentimiento...');

		this.consentManager.revokeConsent();
		this.stopTrackingActivities();

		// Revocar en el backend si hay un visitante identificado
		const visitorId = this.getVisitorId();
		if (visitorId) {
			this.consentBackendService.revokeAllConsents(
				visitorId,
				'Usuario revocó consentimiento desde el SDK'
			)
				.then(() => {
					debugLog('[TrackingPixelSDK] 🔄 Revocación sincronizada con backend');
				})
				.catch(error => {
				});
		}
	}

	/**
	 * Obtiene el estado actual de consentimiento
	 */
	public getConsentStatus() {
		return this.consentManager.getStatus();
	}

	/**
	 * Obtiene el estado completo de consentimiento
	 */
	public getConsentState() {
		return this.consentManager.getState();
	}

	/**
	 * Verifica si el consentimiento ha sido otorgado
	 */
	public isConsentGranted(): boolean {
		return this.consentManager.isGranted();
	}

	/**
	 * Verifica si una categoría específica de consentimiento está permitida
	 */
	public isCategoryAllowed(category: 'analytics' | 'functional' | 'personalization'): boolean {
		return this.consentManager.isCategoryAllowed(category);
	}

	/**
	 * Suscribe un callback para cambios en el consentimiento
	 */
	public subscribeToConsentChanges(callback: (state: ConsentState) => void) {
		return this.consentManager.subscribe(callback);
	}

	/**
	 * Elimina todos los datos del visitante (GDPR Right to Erasure)
	 * IMPORTANTE: Este método elimina TODOS los datos locales y solicita
	 * al backend eliminar los datos del servidor.
	 */
	public async deleteVisitorData(): Promise<void> {
		debugLog('[TrackingPixelSDK] 🗑️ Eliminando datos del visitante (GDPR Right to Erasure)...');

		try {
			// 1. Obtener visitorId antes de eliminar
			const visitorId = this.getVisitorId();

			// 2. Detener todas las actividades
			this.stopTrackingActivities();

			// 3. Limpiar datos locales
			this.clearLocalStorageData();

			// 4. Resetear consentimiento
			this.consentManager.clearConsentData();

			// 5. Si hay visitorId, solicitar eliminación en el servidor
			if (visitorId) {
				try {
					// Eliminar datos de consentimiento del backend
					await this.consentBackendService.deleteConsentData(visitorId);
					debugLog('[TrackingPixelSDK] ✅ Datos de consentimiento eliminados del backend');

					// Aquí iría la llamada al endpoint de eliminación de otros datos del visitante
					// await VisitorsV2Service.getInstance().deleteVisitor(visitorId);
					debugLog('[TrackingPixelSDK] 📡 Solicitud de eliminación enviada al servidor para visitor:', visitorId);
				} catch (error) {
					throw new Error('No se pudieron eliminar los datos del servidor');
				}
			}

			// 6. Limpiar señales y estado
			this.identitySignal.reset();
			this.fingerprint = null;

			debugLog('[TrackingPixelSDK] ✅ Datos del visitante eliminados exitosamente');
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Limpia todos los datos de localStorage relacionados con Guiders
	 */
	private clearLocalStorageData(): void {
		if (typeof localStorage === 'undefined') {
			return;
		}

		const keysToRemove = [
			'fingerprint',
			'guiders_backend_session_id',
			'guiders_recent_chats',
			'guiders_initial_messages',
			'pixelEndpoint',
			'guidersApiKey',
			'guiders_consent_state'
		];

		keysToRemove.forEach(key => {
			try {
				localStorage.removeItem(key);
				debugLog('[TrackingPixelSDK] 🗑️ Eliminado:', key);
			} catch (error) {
			}
		});

		debugLog('[TrackingPixelSDK] 🗑️ Datos locales eliminados');
	}

	/**
	 * Exporta los datos del visitante para cumplimiento GDPR (Right to Access)
	 */
	public async exportVisitorData(): Promise<string> {
		debugLog('[TrackingPixelSDK] 📦 Exportando datos del visitante...');

		const visitorId = this.getVisitorId();

		const data: Record<string, unknown> = {
			visitorId: visitorId,
			fingerprint: this.fingerprint,
			sessionId: this.identitySignal.getSessionId(),
			identityState: this.identitySignal.getState(),
			consentState: this.consentManager.getState(),
			localStorage: this.getLocalStorageData(),
			exportedAt: new Date().toISOString()
		};

		// Incluir datos de consentimiento del backend si hay un visitante identificado
		if (visitorId) {
			try {
				const backendConsentData = await this.consentBackendService.exportConsentData(visitorId);
				data.backendConsents = JSON.parse(backendConsentData);
				debugLog('[TrackingPixelSDK] ✅ Datos de consentimiento del backend incluidos en exportación');
			} catch (error) {
				data.backendConsents = { error: 'No se pudieron obtener datos del backend' };
			}
		}

		return JSON.stringify(data, null, 2);
	}

	/**
	 * Obtiene datos relevantes de localStorage
	 */
	private getLocalStorageData(): Record<string, any> {
		if (typeof localStorage === 'undefined') {
			return {};
		}

		const keys = [
			'fingerprint',
			'guiders_backend_session_id',
			'guiders_recent_chats',
			'pixelEndpoint',
			'guiders_consent_state'
		];

		const data: Record<string, any> = {};

		keys.forEach(key => {
			try {
				const value = localStorage.getItem(key);
				if (value) {
					data[key] = value;
				}
			} catch (error) {
			}
		});

		return data;
	}
}
