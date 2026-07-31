import { MessageV2, AIConfig } from '../../types';
import { AIMetadata } from '../../types/websocket-types';

export type Sender = 'user' | 'agent' | 'system' | 'ai';

export interface MessageRenderData {
    id?: string;
    content: string;
    sender: Sender;
    timestamp?: number | string;
    senderId?: string;
    // 🤖 Campos para mensajes de IA
    isAI?: boolean;
    aiMetadata?: AIMetadata;
}

// 🤖 Configuración de IA para el renderer (singleton)
let aiRenderConfig: AIConfig = {
    enabled: false,
    showAIIndicator: false,
    aiSenderName: 'Agente',
    showTypingIndicator: true
};

// SVG icon de Lucide para el avatar de IA
const AI_BOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;

/**
 * Utilidad unificada para renderizar mensajes de chat
 * Esta función garantiza que todos los mensajes (enviados nuevos, cargados dinámicamente, etc.)
 * tengan exactamente el mismo estilo y estructura visual.
 */
export class MessageRenderer {

    /**
     * 🤖 Actualiza la configuración de IA para el renderer
     */
    public static setAIConfig(config: Partial<AIConfig>): void {
        aiRenderConfig = { ...aiRenderConfig, ...config };
    }

    /**
     * 🤖 Obtiene la configuración de IA actual
     */
    public static getAIConfig(): AIConfig {
        return { ...aiRenderConfig };
    }

    /**
     * Crea un elemento de mensaje unificado
     * @param data - Datos del mensaje para renderizar
     * @returns HTMLElement con el mensaje renderizado con estilos modernos
     */
    public static createMessageElement(data: MessageRenderData): HTMLDivElement {
        const messageDiv = document.createElement('div');
        const isUserMessage = data.sender === 'user';

        // ✅ USAR CLASES COMPATIBLES CON ChatUI - estructura esperada
        // Sin UI de IA: mensajes de bot/IA se renderizan como agente.
        const wrapperClasses = isUserMessage
            ? 'chat-message-wrapper chat-message-user-wrapper'
            : 'chat-message-wrapper chat-message-other-wrapper';

        messageDiv.className = wrapperClasses;

        // Agregar ID si está disponible
        if (data.id) {
            messageDiv.setAttribute('data-message-id', data.id);
        }

        // ✅ Agregar timestamp para date separators
        if (data.timestamp) {
            const timestamp = typeof data.timestamp === 'string'
                ? data.timestamp
                : new Date(data.timestamp).toISOString();
            messageDiv.setAttribute('data-created-at', timestamp);
        }

        // Crear estructura compatible con ChatUI pero con estilos modernos
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';

        const chatMessage = document.createElement('div');
        chatMessage.className = isUserMessage
            ? 'chat-message chat-message-user'
            : 'chat-message chat-message-other';

        const messageText = document.createElement('span');
        messageText.className = 'message-text';
        // Limpiar saltos de línea y espacios múltiples del contenido
        const cleanContent = data.content
            .replace(/\r\n/g, ' ')  // Reemplazar saltos de línea Windows
            .replace(/\n/g, ' ')     // Reemplazar saltos de línea Unix
            .replace(/\r/g, ' ')     // Reemplazar retornos de carro
            .replace(/\s+/g, ' ')    // Reemplazar múltiples espacios con uno solo
            .trim();                 // Eliminar espacios al inicio/final
        messageText.textContent = cleanContent;

        // Spacer invisible para reservar espacio para la hora (estilo WhatsApp)
        const timeSpacer = document.createElement('span');
        timeSpacer.className = 'message-time-spacer';
        const timeText = isUserMessage ? `${this.formatTime(data.timestamp)} ✓` : this.formatTime(data.timestamp);
        timeSpacer.textContent = ` ${timeText}`; // Espacio + texto para medir ancho

        const messageTime = document.createElement('span');
        messageTime.className = 'chat-message-time';
        messageTime.textContent = timeText;

        chatMessage.appendChild(messageText);
        chatMessage.appendChild(timeSpacer);
        chatMessage.appendChild(messageTime);
        contentWrapper.appendChild(chatMessage);
        messageDiv.appendChild(contentWrapper);

        // Aplicar estilos modernos formales
        this.applyModernMessageStyles(messageDiv, isUserMessage, false);

        return messageDiv;
    }

    /**
     * 🤖 Crea el header de IA con avatar, nombre y badge
     */
    private static createAIHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'ai-message-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(107, 114, 128, 0.15);
        `;

        // Avatar: SVG de Lucide
        const avatar = document.createElement('span');
        avatar.className = 'ai-avatar';
        avatar.innerHTML = AI_BOT_SVG;
        avatar.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
        `;

        // Nombre
        const name = document.createElement('span');
        name.className = 'ai-sender-name';
        name.textContent = aiRenderConfig.aiSenderName || 'Asistente IA';
        name.style.cssText = `
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
        `;

        header.appendChild(avatar);
        header.appendChild(name);

        return header;
    }
    
    /**
     * Convierte MessageV2 (de API) a MessageRenderData
     */
    public static fromMessageV2(message: MessageV2): MessageRenderData {
        const isAIMessage = this.isAIMessage(message);

        return {
            id: message.id,
            content: message.content,
            sender: this.determineSender(message),
            timestamp: message.createdAt,
            senderId: message.senderId,
            // Campos de IA
            isAI: isAIMessage,
            aiMetadata: message.aiMetadata ? {
                model: message.aiMetadata.model,
                processingTimeMs: message.aiMetadata.processingTimeMs,
                context: message.aiMetadata.context
            } : undefined
        };
    }

    /**
     * Detecta si un mensaje es de IA basándose en múltiples criterios
     */
    private static isAIMessage(message: MessageV2): boolean {
        // 1. Campo explícito isAI
        if (message.isAI === true) {
            return true;
        }

        // 2. Tipo de mensaje 'AI' o 'ai' (case insensitive)
        if (message.type && message.type.toLowerCase() === 'ai') {
            return true;
        }

        // 3. SenderId conocido como IA
        if (message.senderId === 'ai' || message.senderId === 'AI') {
            return true;
        }

        // 4. Tiene aiMetadata
        if (message.aiMetadata && message.aiMetadata.model) {
            return true;
        }

        // 5. Verificar contra IDs configurados de IA
        const aiSenderIds = aiRenderConfig.aiSenderIds || [];
        if (aiSenderIds.includes(message.senderId)) {
            return true;
        }

        return false;
    }

    /**
     * Determina el tipo de sender basado en MessageV2
     */
    private static determineSender(message: MessageV2): Sender {
        // Primero verificar si es mensaje de IA
        if (this.isAIMessage(message)) {
            return 'ai';
        }

        // Lógica para mensajes de usuario
        try {
            const visitorId = localStorage.getItem('visitorId');
            if (visitorId && message.senderId === visitorId) {
                return 'user';
            }
        } catch (error) {
        }

        // Determinar por tipo si está disponible
        if (message.type === 'user') {
            return 'user';
        }
        if (message.type === 'system') {
            return 'system';
        }

        // Fallback: es un agente/asistente
        return 'agent';
    }
    
    /**
     * Obtiene las iniciales del participante para el avatar
     */
    private static getParticipantInitials(senderId: string): string {
        if (!senderId) {
            return 'BOT';
        }
        
        // Si es un ID simple, usar las primeras letras
        if (senderId.length <= 3) {
            return senderId.toUpperCase();
        }
        
        // Extraer iniciales de nombre si está presente
        const words = senderId.split(/[\s_-]+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        
        return senderId.substring(0, 2).toUpperCase();
    }
    
    /**
     * Escapa HTML para prevenir XSS
     */
    private static escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    /**
     * Formatea timestamp a hora legible
     */
    private static formatTime(timestamp?: number | string): string {
        let date: Date;
        
        if (!timestamp) {
            date = new Date();
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            date = new Date(timestamp);
        }
        
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    /**
     * Aplica estilos CSS modernos a un mensaje
     * Esta es la función clave que define el aspecto visual unificado
     */
    private static applyModernMessageStyles(messageDiv: HTMLElement, isUserMessage: boolean, isAIMessage: boolean = false): void {
        const avatar = messageDiv.querySelector('.chat-avatar') as HTMLElement;
        const messageEl = messageDiv.querySelector('.chat-message') as HTMLElement;
        const text = messageDiv.querySelector('.message-text') as HTMLElement;
        const time = messageDiv.querySelector('.chat-message-time') as HTMLElement;
        const contentWrapper = messageDiv.querySelector('.message-content-wrapper') as HTMLElement;

        // ✅ ESTILOS WRAPPER - Compatible con ChatUI
        messageDiv.style.cssText = `
            display: flex;
            align-items: flex-end;
            margin-bottom: 3px;
            ${isUserMessage ? 'flex-direction: row-reverse; margin-left: 10%;' : 'flex-direction: row; margin-right: 10%;'}
            opacity: 1;
            transform: translateY(0);
        `;

        // ✅ AVATAR (solo para mensajes de otros) - Diseño profesional
        if (avatar) {
            avatar.style.cssText = `
                margin-right: 12px;
                margin-bottom: 4px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            `;
            
            const avatarCircle = avatar.querySelector('.avatar-circle') as HTMLElement;
            if (avatarCircle) {
                avatarCircle.style.cssText = `
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    border: none;
                    box-sizing: border-box;
                    min-width: 32px;
                    min-height: 32px;
                    max-width: 32px;
                    max-height: 32px;
                `;
            }
        }

        // ✅ WRAPPER DE CONTENIDO - Unificado para ambos tipos de mensaje
        if (contentWrapper) {
            contentWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                ${isUserMessage ? 'align-items: flex-end;' : 'align-items: flex-start;'}
                max-width: 100%;
            `;
        }

        // ✅ MENSAJE PRINCIPAL - Layout tipo WhatsApp
        if (messageEl) {
            // 🤖 Estilos específicos para mensajes de IA
            let messageBackground: string;
            let messageBorder: string = '';

            if (isUserMessage) {
                messageBackground = `background: #D1E7FF;`;
                messageBorder = `border-bottom-right-radius: 2px;`;
            } else {
                // Mensajes de agente o IA: mismo estilo
                messageBackground = `background: #FFFFFF;`;
                messageBorder = `border-bottom-left-radius: 2px;`;
            }

            messageEl.style.cssText = `
                padding: 8px 12px;
                border-radius: 10px;
                position: relative;
                overflow-wrap: break-word;
                word-wrap: break-word;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                display: inline-block;
                max-width: 100%;
                ${messageBackground}
                color: #2c3e50;
                ${messageBorder}
                transition: all 0.2s ease;
            `;
        }

        // ✅ TIME SPACER - Invisible pero ocupa espacio (estilo WhatsApp)
        const timeSpacer = messageDiv.querySelector('.message-time-spacer') as HTMLElement;
        if (timeSpacer) {
            timeSpacer.style.cssText = `
                visibility: hidden;
                font-size: 10px;
                padding-left: 8px;
                white-space: nowrap;
            `;
        }

        // ✅ TEXTO DEL MENSAJE - TIPOGRAFÍA OPTIMIZADA (inline para fluir con spacer)
        if (text) {
            text.style.cssText = `
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
                overflow-wrap: break-word;
                word-wrap: break-word;
                white-space: pre-wrap;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                color: #2c3e50;
            `;
        }

        // ✅ TIEMPO - Posicionado absolutamente al final (estilo WhatsApp)
        if (time) {
            time.style.cssText = `
                position: absolute;
                bottom: 6px;
                right: 10px;
                font-size: 10px;
                color: rgba(44, 62, 80, 0.5);
                font-weight: 400;
                letter-spacing: 0.01em;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                white-space: nowrap;
                opacity: 0.9;
            `;
        }

        // ✅ EFECTOS HOVER - CONSISTENTE CON COLORES DEL HEADER
        if (messageEl) {
            // Efecto hover deshabilitado por solicitud del usuario
        }
        
        // Añadir animación CSS si no existe
        this.ensureAnimationStyles();
    }
    
    /**
     * Asegura que las animaciones CSS estén disponibles
     */
    private static ensureAnimationStyles(): void {
        const existingStyle = document.getElementById('guiders-message-animations');
        if (existingStyle) return;
        
        const style = document.createElement('style');
        style.id = 'guiders-message-animations';
        style.innerHTML = `
            @keyframes messageSlideIn {
                0% {
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                    filter: blur(4px);
                }
                50% {
                    opacity: 0.7;
                    transform: translateY(8px) scale(0.98);
                    filter: blur(2px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0);
                }
            }
            
            .modern-message {
                will-change: transform, opacity;
            }
            
            .modern-message .message-content {
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .modern-message .message-avatar {
                transition: transform 0.2s ease;
            }
            
            /* Efecto hover del avatar deshabilitado por solicitud del usuario */
        `;
        document.head.appendChild(style);
    }
}