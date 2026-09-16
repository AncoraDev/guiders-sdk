// chat-utils.ts - Utilidades para el sistema de chat

/**
 * Formatea la hora para mostrarla en los mensajes
 * @param date Fecha a formatear
 * @returns Hora formateada en formato HH:mm
 */
export function formatTime(date: Date): string {
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

/**
 * Formatea la fecha para el separador
 * @param date Fecha a formatear
 * @returns Fecha formateada según su relación con hoy
 */
export function formatDate(date: Date): string {
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	const isToday = date.toDateString() === today.toDateString();
	const isYesterday = date.toDateString() === yesterday.toDateString();

	if (isToday) {
		return 'Hoy';
	} else if (isYesterday) {
		return 'Ayer';
	} else {
		const options: Intl.DateTimeFormatOptions = {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		};
		return date.toLocaleDateString('es-ES', options);
	}
}

/**
 * Verifica si un participante es un bot basándose en su nombre
 * @param participantName Nombre del participante
 * @returns true si es un bot, false en caso contrario
 */
export function isBot(participantName: string): boolean {
	const botKeywords = ['bot', 'chatbot', 'assistant', 'asistente', 'ia', 'ai', 'automático', 'virtual'];
	const lowerName = participantName.toLowerCase();
	return botKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Genera iniciales a partir de un nombre completo
 * @param name Nombre completo
 * @returns Iniciales (máximo 2 caracteres)
 */
export function generateInitials(name: string): string {
	const nameParts = name.trim().split(' ');
	if (nameParts.length >= 2) {
		return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
	} else if (nameParts.length === 1) {
		return nameParts[0].substring(0, 2).toUpperCase();
	}
	return 'AH'; // Fallback
}

/**
 * Crea un separador de fecha para el chat
 * @param dateStr Fecha formateada como string
 * @returns Elemento HTML del separador
 */
export function createDateSeparator(dateStr: string): HTMLDivElement {
	const separator = document.createElement('div');
	separator.className = 'chat-date-separator';
	separator.setAttribute('data-date', dateStr);
	
	// Aplicar estilos minimalistas monocromos
	separator.style.cssText = `
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 20px 0;
		position: relative;
	`;

	// Crear línea horizontal izquierda
	const leftLine = document.createElement('div');
	leftLine.style.cssText = `
		flex: 1;
		height: 1px;
		background: #e4e4e7;
		margin-right: 12px;
	`;

	// Crear contenedor del texto con diseño minimalista
	const textContainer = document.createElement('div');
	textContainer.style.cssText = `
		color: #71717a;
		padding: 4px 0;
		font-size: 11px;
		font-weight: 500;
		white-space: nowrap;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	`;
	
	const text = document.createElement('span');
	text.textContent = dateStr;
	textContainer.appendChild(text);

	// Crear línea horizontal derecha
	const rightLine = document.createElement('div');
	rightLine.style.cssText = `
		flex: 1;
		height: 1px;
		background: #e4e4e7;
		margin-left: 12px;
	`;
	
	// Ensamblar el separador
	separator.appendChild(leftLine);
	separator.appendChild(textContainer);
	separator.appendChild(rightLine);
	
	return separator;
}

/**
 * Pista de pruebas: últimos 8 del visitorId, mismo recorte que Console
 * (`Visitante #2d2d912d`). Solo en localhost / ?dev / GUIDERS_CONFIG.dev.
 */
export function getVisitorTestHint(visitorId: string | null | undefined): string | null {
	if (!visitorId || visitorId.length < 8) {
		return null;
	}

	if (typeof window === 'undefined') {
		return null;
	}

	const host = window.location.hostname;
	const isLocal = host === 'localhost' || host === '127.0.0.1';
	const params = new URLSearchParams(window.location.search);
	const cfg = (window as Window & { GUIDERS_CONFIG?: { dev?: boolean; environment?: string } }).GUIDERS_CONFIG;
	const isDev =
		isLocal ||
		params.has('dev') ||
		cfg?.dev === true ||
		cfg?.environment === 'development';

	if (!isDev) {
		return null;
	}

	return `#${visitorId.slice(-8)}`;
}