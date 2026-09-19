/**
 * 📝 Lead Capture Session Service
 *
 * Guarda y recupera el progreso del asistente de captación para que una
 * captación a medias se pueda reanudar más tarde, incluso en otra visita.
 *
 * El backend la guarda por visitante (no por chat), porque el SDK abre un chat
 * nuevo en cada visita sin conversación abierta. `sessionStorage` hace de caché
 * rápida: el modo del asistente se decide en la primera pintada sin esperar a
 * la red, y si la red falla el visitante no pierde lo que acaba de contestar.
 */

import { EndpointManager } from '../core/endpoint-manager';
import { debugLog, debugWarn } from '../utils/debug-logger';
import { getCommonFetchOptions } from '../utils/http-headers';
import { LeadCaptureProgress, LeadCaptureSession, LeadCaptureStatus } from '../types';

const STORAGE_PREFIX = 'guiders_lead_capture_';

/** El guion avanza a golpe de clic; sin margen se mandaría una petición por paso. */
const SAVE_DEBOUNCE_MS = 500;

const EMPTY_SESSION: LeadCaptureSession = { status: 'none', progress: null };

/** Respuesta de GET /v2/lead-capture/session. */
interface LeadCaptureSessionEnvelope {
	session: {
		status?: 'in_progress' | 'completed';
		phase?: LeadCaptureProgress['phase'];
		stepId?: string | null;
		chatId?: string | null;
		flowId?: string;
		answers?: LeadCaptureProgress['answers'];
		trail?: string[];
	} | null;
}

export class LeadCaptureSessionService {
	private static instance: LeadCaptureSessionService | null = null;

	private pendingSave: number | null = null;
	private queued: { chatId: string; progress: LeadCaptureProgress } | null = null;

	private constructor() {}

	static getInstance(): LeadCaptureSessionService {
		if (!LeadCaptureSessionService.instance) {
			LeadCaptureSessionService.instance = new LeadCaptureSessionService();
		}
		return LeadCaptureSessionService.instance;
	}

	/**
	 * Progreso guardado para este chat. Nunca lanza: sin progreso se empieza de
	 * cero, que es mejor que dejar el asistente bloqueado.
	 */
	async load(chatId: string): Promise<LeadCaptureSession> {
		const cached = this.readCache(chatId);
		const remote = await this.fetchSession();

		if (!remote) return cached ?? EMPTY_SESSION;
		if (remote.status === 'completed') return remote;

		// La caché es de esta pestaña, así que va por delante de lo que llegó a
		// guardarse en el backend si la última petición se quedó a medias.
		const local = cached?.progress;
		if (local && this.isAhead(local, remote.progress)) {
			return { status: cached!.status, progress: local };
		}
		return remote;
	}

	/**
	 * Guarda el avance. El visitante no espera: la caché es inmediata y la
	 * petición va con un margen para no mandar una por paso.
	 */
	save(chatId: string | null, progress: LeadCaptureProgress): void {
		if (!chatId) return;

		const session: LeadCaptureSession = {
			status: progress.phase === 'done' ? 'completed' : 'in_progress',
			progress,
		};
		this.writeCache(chatId, session);

		// El intro no es progreso: nadie tiene que reanudar un guion sin empezar.
		if (progress.phase === 'intro') return;

		this.queued = { chatId, progress };
		if (this.pendingSave !== null) return;
		this.pendingSave = window.setTimeout(() => {
			this.pendingSave = null;
			const queued = this.queued;
			this.queued = null;
			if (queued) void this.pushSession(queued.chatId, queued.progress);
		}, SAVE_DEBOUNCE_MS);
	}

	/** Captación enviada: el backend ya la cierra, la caché sobra. */
	clear(chatId: string): void {
		if (this.pendingSave !== null) {
			window.clearTimeout(this.pendingSave);
			this.pendingSave = null;
			this.queued = null;
		}
		try {
			sessionStorage?.removeItem(this.cacheKey(chatId));
		} catch {
			/* nada que limpiar */
		}
	}

	// ─── Backend ──────────────────────────────────────────────────────────────

	private async fetchSession(): Promise<LeadCaptureSession | null> {
		try {
			const response = await fetch(
				`${this.apiRoot()}/v2/lead-capture/session`,
				getCommonFetchOptions('GET')
			);
			// 401 con la sesión aún sin establecer es lo normal en la primera carga.
			if (!response.ok) {
				debugWarn(
					`📝 [LeadCapture] No se pudo leer la captación (HTTP ${response.status})`
				);
				return null;
			}

			const data = (await response.json()) as LeadCaptureSessionEnvelope;
			if (!data?.session) return EMPTY_SESSION;

			const remote = data.session;
			if (remote.status === 'completed') {
				return { status: 'completed', progress: null };
			}
			if (!remote.phase) return EMPTY_SESSION;

			debugLog(`📝 [LeadCapture] Captación a medias recuperada: ${remote.phase}`);
			return {
				status: 'in_progress',
				progress: {
					phase: remote.phase,
					stepId: remote.stepId ?? null,
					answers: remote.answers ?? [],
					trail: remote.trail ?? [],
				},
			};
		} catch (error) {
			debugWarn('📝 [LeadCapture] Error al leer la captación:', error);
			return null;
		}
	}

	private async pushSession(
		chatId: string,
		progress: LeadCaptureProgress
	): Promise<void> {
		try {
			const options = getCommonFetchOptions('PUT');
			options.body = JSON.stringify({
				chatId,
				phase: progress.phase,
				stepId: progress.stepId,
				answers: progress.answers,
				trail: progress.trail,
			});

			const response = await fetch(
				`${this.apiRoot()}/v2/lead-capture/session`,
				options
			);
			if (!response.ok) {
				debugWarn(
					`📝 [LeadCapture] No se pudo guardar la captación (HTTP ${response.status})`
				);
			}
		} catch (error) {
			// La caché de la pestaña ya tiene el avance, así que el guion sigue.
			debugWarn('📝 [LeadCapture] Error al guardar la captación:', error);
		}
	}

	private apiRoot(): string {
		const baseEndpoint =
			localStorage.getItem('pixelEndpoint') ||
			EndpointManager.getInstance().getEndpoint();
		return baseEndpoint.endsWith('/api') ? baseEndpoint : `${baseEndpoint}/api`;
	}

	// ─── Caché de pestaña ─────────────────────────────────────────────────────

	private cacheKey(chatId: string): string {
		return `${STORAGE_PREFIX}${chatId}`;
	}

	private readCache(chatId: string): LeadCaptureSession | null {
		try {
			const raw = sessionStorage?.getItem(this.cacheKey(chatId));
			if (!raw) return null;
			const parsed = JSON.parse(raw) as LeadCaptureSession;
			const progress = this.normalizeProgress(parsed?.progress);
			if (!progress) return null;
			return { status: this.normalizeStatus(parsed?.status, progress), progress };
		} catch (error) {
			debugWarn('📝 [LeadCapture] Caché de progreso ilegible:', error);
			return null;
		}
	}

	private writeCache(chatId: string, session: LeadCaptureSession): void {
		try {
			sessionStorage?.setItem(this.cacheKey(chatId), JSON.stringify(session));
		} catch {
			/* el asistente sigue funcionando sin persistencia */
		}
	}

	/** Lo que venga de fuera puede ser de una versión vieja o estar a medias. */
	private normalizeProgress(
		progress: LeadCaptureProgress | null | undefined
	): LeadCaptureProgress | null {
		if (!progress?.phase) return null;
		return {
			phase: progress.phase,
			stepId: progress.stepId ?? null,
			answers: Array.isArray(progress.answers) ? progress.answers : [],
			trail: Array.isArray(progress.trail) ? progress.trail : [],
		};
	}

	private normalizeStatus(
		status: LeadCaptureStatus | undefined,
		progress: LeadCaptureProgress
	): LeadCaptureStatus {
		if (status === 'completed' || progress.phase === 'done') return 'completed';
		// El intro todavía no es progreso: el visitante ni ha empezado.
		return progress.phase === 'intro' ? 'none' : 'in_progress';
	}

	/**
	 * Si el último guardado no llegó a salir, la pestaña tiene más recorrido que
	 * el backend y es lo que hay que reanudar.
	 */
	private isAhead(
		candidate: LeadCaptureProgress,
		other: LeadCaptureProgress | null
	): boolean {
		if (!other) return true;
		return candidate.trail.length > other.trail.length;
	}
}
