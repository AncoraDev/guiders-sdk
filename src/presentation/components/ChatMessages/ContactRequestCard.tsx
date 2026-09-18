import { useState } from 'preact/hooks';
import { ChatV2Service } from '../../../services/chat-v2-service';
import { chatIdSignal, messagesSignal } from '../../signals';
import { ChatMessageParams } from '../../types/chat-types';
import {
    actionsRowStyle,
    buttonDisabledStyle,
    buttonStyle,
    ghostButtonStyle,
    cardStyle,
    checkboxInputStyle,
    checkboxLinkStyle,
    checkboxRowStyle,
    doneCardStyle,
    doneCheckStyle,
    doneHintStyle,
    doneNameStyle,
    fieldErrorStyle,
    fieldStyle,
    formErrorStyle,
    optionalLabelStyle,
    prefaceStyle,
    requiredLabelStyle,
    resolveInputStyle,
    subtitleStyle,
    titleStyle,
} from './ContactRequestCard.styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-()]{6,20}$/;
const DEFAULT_PREFACE = 'Para atenderte mejor, necesitamos unos datos.';
const DEFAULT_PRIVACY_LABEL = 'He leído y acepto la política de privacidad';
const DEFAULT_MARKETING_LABEL = 'Acepto recibir comunicaciones';

type FieldName = 'nombre' | 'apellidos' | 'email' | 'telefono' | 'poblacion';
type FieldErrors = Partial<Record<FieldName | 'privacy', string>>;

export function isContactInteractiveMessage(msg: ChatMessageParams): boolean {
    const action = msg.systemData?.action;
    return (
        action === 'contact_request' ||
        action === 'contact_submission' ||
        action === 'contact_cancellation'
    );
}

interface Props {
    message: ChatMessageParams;
    alreadySubmitted: boolean;
    alreadyCancelled?: boolean;
}

export function ContactRequestCard({ message, alreadySubmitted, alreadyCancelled = false }: Props) {
    const action = message.systemData?.action;
    const status = message.systemData?.status;
    const submitted = alreadySubmitted || status === 'submitted' || status === 'confirmed';
    const cancelled = alreadyCancelled || action === 'contact_cancellation' || status === 'cancelled';

    if (cancelled && action !== 'contact_submission') {
        return (
            <div class="guiders-contact-card" style={doneCardStyle} role="status">
                <p style={titleStyle}>Formulario cancelado</p>
                <p style={doneHintStyle}>Has rechazado enviar tus datos.</p>
            </div>
        );
    }

    if (action === 'contact_submission' || (action === 'contact_request' && submitted)) {
        const data = message.systemData?.data;
        return (
            <div class="guiders-contact-card" style={doneCardStyle} role="status">
                <span style={doneCheckStyle} aria-hidden="true">✓</span>
                <p style={titleStyle}>Datos enviados</p>
                <p style={doneHintStyle}>Enviado, el comercial lo revisará.</p>
                {data?.nombre && (
                    <p style={doneNameStyle}>
                        {data.nombre}{data.apellidos ? ` ${data.apellidos}` : ''}
                    </p>
                )}
            </div>
        );
    }

    return (
        <ContactRequestForm
            requestId={message.systemData?.requestId}
            preface={message.systemData?.preface || message.text || DEFAULT_PREFACE}
            privacyPolicyUrl={message.systemData?.legal?.privacyPolicyUrl}
            privacyLabel={
                message.systemData?.legal?.privacyCheckboxLabel || DEFAULT_PRIVACY_LABEL
            }
            marketingLabel={
                message.systemData?.legal?.marketingCheckboxLabel || DEFAULT_MARKETING_LABEL
            }
        />
    );
}

function ContactRequestForm({
    requestId,
    preface,
    privacyPolicyUrl,
    privacyLabel,
    marketingLabel,
}: {
    requestId?: string;
    preface: string;
    privacyPolicyUrl?: string;
    privacyLabel: string;
    marketingLabel: string;
}) {
    const [nombre, setNombre] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [poblacion, setPoblacion] = useState('');
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [acceptedMarketing, setAcceptedMarketing] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [focused, setFocused] = useState<FieldName | null>(null);
    const [sending, setSending] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const clearFieldError = (field: FieldName | 'privacy') => {
        if (!fieldErrors[field]) return;
        setFieldErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const validate = (): FieldErrors => {
        const errors: FieldErrors = {};
        const trimmedNombre = nombre.trim();
        const trimmedEmail = email.trim();
        const trimmedTelefono = telefono.trim();
        const trimmedPoblacion = poblacion.trim();

        if (!trimmedNombre) errors.nombre = 'Obligatorio';
        if (!trimmedEmail) errors.email = 'Obligatorio';
        else if (!EMAIL_RE.test(trimmedEmail)) errors.email = 'Introduce un email válido.';
        if (!trimmedTelefono) errors.telefono = 'Obligatorio';
        else if (!PHONE_RE.test(trimmedTelefono)) errors.telefono = 'Introduce un teléfono válido.';
        if (!trimmedPoblacion) errors.poblacion = 'Obligatorio';
        if (!acceptedPrivacy) errors.privacy = 'Debes aceptar la política de privacidad';

        return errors;
    };

    const onSubmit = async (event: Event) => {
        event.preventDefault();
        const errors = validate();
        setFieldErrors(errors);
        setFormError('');
        if (Object.keys(errors).length > 0) return;

        const chatId = chatIdSignal.value;
        if (!chatId) {
            setFormError('No hay chat activo.');
            return;
        }

        setSending(true);
        try {
            await ChatV2Service.getInstance().submitContactData(chatId, {
                nombre: nombre.trim(),
                email: email.trim(),
                telefono: telefono.trim(),
                poblacion: poblacion.trim(),
                acceptedPrivacyPolicy: true,
                acceptedMarketing,
                apellidos: apellidos.trim() || undefined,
            });
            messagesSignal.value = messagesSignal.value.map((msg) => {
                if (msg.systemData?.requestId !== requestId || msg.systemData?.action !== 'contact_request') {
                    return msg;
                }
                return {
                    ...msg,
                    systemData: {
                        ...msg.systemData,
                        status: 'submitted',
                        acceptedPrivacyPolicy: true,
                        acceptedMarketing,
                        data: {
                            nombre: nombre.trim(),
                            apellidos: apellidos.trim() || undefined,
                            email: email.trim(),
                            telefono: telefono.trim(),
                            poblacion: poblacion.trim(),
                        },
                    },
                };
            });
        } catch {
            setFormError('No se pudieron enviar los datos. Inténtalo de nuevo.');
        } finally {
            setSending(false);
        }
    };

    const onCancel = async () => {
        const chatId = chatIdSignal.value;
        if (!chatId) {
            setFormError('No hay chat activo.');
            return;
        }

        setCancelling(true);
        setFormError('');
        try {
            await ChatV2Service.getInstance().cancelContactData(chatId);
            messagesSignal.value = messagesSignal.value.map((msg) => {
                if (msg.systemData?.requestId !== requestId || msg.systemData?.action !== 'contact_request') {
                    return msg;
                }
                return {
                    ...msg,
                    systemData: {
                        ...msg.systemData,
                        status: 'cancelled',
                    },
                };
            });
        } catch {
            setFormError('No se pudo cancelar el formulario. Inténtalo de nuevo.');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <form class="guiders-contact-card" style={cardStyle} onSubmit={onSubmit} noValidate>
            <p style={titleStyle}>Tus datos de contacto</p>
            <p style={prefaceStyle}>{preface}</p>
            <p style={subtitleStyle}>Nombre, email, teléfono y población son obligatorios.</p>

            <Field
                name="nombre"
                label="Nombre *"
                required
                value={nombre}
                focused={focused}
                error={fieldErrors.nombre}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={(value) => {
                    setNombre(value);
                    clearFieldError('nombre');
                }}
            />
            <Field
                name="apellidos"
                label="Apellidos"
                value={apellidos}
                focused={focused}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setApellidos}
            />
            <Field
                name="email"
                label="Email *"
                type="email"
                required
                value={email}
                focused={focused}
                error={fieldErrors.email}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={(value) => {
                    setEmail(value);
                    clearFieldError('email');
                }}
            />
            <Field
                name="telefono"
                label="Teléfono *"
                type="tel"
                required
                value={telefono}
                focused={focused}
                error={fieldErrors.telefono}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={(value) => {
                    setTelefono(value);
                    clearFieldError('telefono');
                }}
            />
            <Field
                name="poblacion"
                label="Población *"
                required
                value={poblacion}
                focused={focused}
                error={fieldErrors.poblacion}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={(value) => {
                    setPoblacion(value);
                    clearFieldError('poblacion');
                }}
            />

            <label style={checkboxRowStyle}>
                <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    required
                    style={checkboxInputStyle}
                    onChange={(event) => {
                        setAcceptedPrivacy((event.target as HTMLInputElement).checked);
                        clearFieldError('privacy');
                    }}
                />
                <span>
                    <PrivacyLabel text={privacyLabel} url={privacyPolicyUrl} />
                    {fieldErrors.privacy && (
                        <p style={fieldErrorStyle}>{fieldErrors.privacy}</p>
                    )}
                </span>
            </label>

            <label style={checkboxRowStyle}>
                <input
                    type="checkbox"
                    checked={acceptedMarketing}
                    style={checkboxInputStyle}
                    onChange={(event) =>
                        setAcceptedMarketing((event.target as HTMLInputElement).checked)
                    }
                />
                <span>{marketingLabel}</span>
            </label>

            {formError && <p style={formErrorStyle}>{formError}</p>}

            <div style={actionsRowStyle}>
                <button
                    type="button"
                    style={cancelling || sending ? buttonDisabledStyle : ghostButtonStyle}
                    disabled={sending || cancelling}
                    onClick={onCancel}
                >
                    {cancelling ? 'Cancelando…' : 'Cancelar'}
                </button>
                <button type="submit" style={sending || cancelling ? buttonDisabledStyle : buttonStyle} disabled={sending || cancelling}>
                    {sending ? 'Enviando…' : 'Enviar'}
                </button>
            </div>
        </form>
    );
}

function PrivacyLabel({ text, url }: { text: string; url?: string }) {
    const href = url?.trim();
    if (!href) {
        return <>{text}</>;
    }

    const match = text.match(/política de privacidad/i);
    if (!match || match.index === undefined) {
        return (
            <>
                {text}{' '}
                <a href={href} target="_blank" rel="noopener noreferrer" style={checkboxLinkStyle}>
                    política de privacidad
                </a>
            </>
        );
    }

    const start = match.index;
    const end = start + match[0].length;
    return (
        <>
            {text.slice(0, start)}
            <a href={href} target="_blank" rel="noopener noreferrer" style={checkboxLinkStyle}>
                {match[0]}
            </a>
            {text.slice(end)}
        </>
    );
}

function Field({
    name,
    label,
    type = 'text',
    required = false,
    value,
    focused,
    error,
    onFocus,
    onBlur,
    onInput,
}: {
    name: FieldName;
    label: string;
    type?: string;
    required?: boolean;
    value: string;
    focused: FieldName | null;
    error?: string;
    onFocus: (name: FieldName) => void;
    onBlur: () => void;
    onInput: (value: string) => void;
}) {
    const fieldId = `gds-contact-${name}`;
    return (
        <label style={fieldStyle} for={fieldId}>
            <span style={required ? requiredLabelStyle : optionalLabelStyle}>{label}</span>
            <input
                id={fieldId}
                type={type}
                value={value}
                required={required}
                autocomplete="off"
                style={resolveInputStyle({ focused: focused === name, invalid: !!error })}
                onFocus={() => onFocus(name)}
                onBlur={onBlur}
                onInput={(event) => onInput((event.target as HTMLInputElement).value)}
            />
            {error && <p style={fieldErrorStyle}>{error}</p>}
        </label>
    );
}
