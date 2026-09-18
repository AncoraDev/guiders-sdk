/**
 * 📝 Lead Capture Flow Service
 *
 * Resuelve el guion de captación configurado por la empresa para este sitio.
 * Se pide una sola vez por carga de página y se cachea el resultado, incluido
 * el caso de "no hay guion": si no hay nada configurado el chat se comporta
 * exactamente como antes.
 */

import { debugLog, debugWarn } from '../utils/debug-logger';
import { ResolvedLeadCaptureFlow } from '../types';

export interface LeadCaptureFlowServiceConfig {
	/** Dominio del sitio donde corre el SDK */
	domain: string;
	/** API Key pública del sitio */
	apiKey: string;
	/** Raíz de la API, por ejemplo http://localhost:3000/api */
	apiBaseUrl: string;
}

const EMPTY_FLOW: ResolvedLeadCaptureFlow = {
	flow: null,
	legal: {
		privacyPolicyUrl: '',
		privacyCheckboxLabel: 'He leído y acepto la política de privacidad',
		marketingCheckboxLabel: 'Acepto recibir comunicaciones',
	},
};

export class LeadCaptureFlowService {
	private static instance: LeadCaptureFlowService | null = null;

	private config: LeadCaptureFlowServiceConfig | null = null;
	private pending: Promise<ResolvedLeadCaptureFlow> | null = null;
	private resolved: ResolvedLeadCaptureFlow | null = null;

	private constructor() {}

	static getInstance(): LeadCaptureFlowService {
		if (!LeadCaptureFlowService.instance) {
			LeadCaptureFlowService.instance = new LeadCaptureFlowService();
		}
		return LeadCaptureFlowService.instance;
	}

	configure(config: LeadCaptureFlowServiceConfig): void {
		this.config = config;
	}

	/** Guion ya resuelto, sin provocar una petición nueva. */
	getResolved(): ResolvedLeadCaptureFlow | null {
		return this.resolved;
	}

	/**
	 * Pide el guion al backend. Las llamadas concurrentes comparten la misma
	 * petición y el resultado se reutiliza durante toda la carga de página.
	 */
	async resolve(): Promise<ResolvedLeadCaptureFlow> {
		if (this.resolved) return this.resolved;
		if (this.pending) return this.pending;

		if (!this.config) {
			debugWarn('📝 [LeadCapture] Servicio sin configurar, no hay guion');
			return EMPTY_FLOW;
		}

		this.pending = this.fetchFlow(this.config)
			.then((result) => {
				this.resolved = result;
				return result;
			})
			.finally(() => {
				this.pending = null;
			});

		return this.pending;
	}

	private async fetchFlow(
		config: LeadCaptureFlowServiceConfig
	): Promise<ResolvedLeadCaptureFlow> {
		const url = `${config.apiBaseUrl}/v2/lead-capture/flow/resolve`;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					domain: config.domain,
					apiKey: config.apiKey,
				}),
			});

			if (!response.ok) {
				debugWarn(
					`📝 [LeadCapture] No se pudo resolver el guion (HTTP ${response.status})`
				);
				return EMPTY_FLOW;
			}

			const data = (await response.json()) as ResolvedLeadCaptureFlow;
			const flow = data?.flow?.enabled ? data.flow : null;
			debugLog(
				flow
					? `📝 [LeadCapture] Guion activo: ${flow.name} (${flow.steps.length} pasos)`
					: '📝 [LeadCapture] La empresa no tiene guion activo'
			);

			return {
				flow,
				legal: data?.legal ?? EMPTY_FLOW.legal,
			};
		} catch (error) {
			debugWarn('📝 [LeadCapture] Error al resolver el guion:', error);
			return EMPTY_FLOW;
		}
	}
}
