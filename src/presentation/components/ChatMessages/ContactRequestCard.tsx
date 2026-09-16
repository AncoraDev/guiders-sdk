import { useState } from 'preact/hooks';
import { ChatV2Service } from '../../../services/chat-v2-service';
import { chatIdSignal, messagesSignal } from '../../signals';
import { ChatMessageParams } from '../../types/chat-types';
import {
    buttonDisabledStyle,
    buttonStyle,
    cardStyle,
    doneCardStyle,
    doneCheckStyle,
    doneHintStyle,
    doneNameStyle,
    fieldErrorStyle,
    fieldStyle,
    formErrorStyle,
    optionalLabelStyle,
    requiredLabelStyle,
    resolveInputStyle,
    subtitleStyle,
    titleStyle,
} from './ContactRequestCard.styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-()]{6,20}$/;

type FieldName = 'nombre' | 'apellidos' | 'email' | 'telefono' | 'poblacion';
type FieldErrors = Partial<Record<FieldName, string>>;

export function isContactInteractiveMessage(msg: ChatMessageParams): boolean {
    const action = msg.systemData?.action;
    return action === 'contact_request' || action === 'contact_submission';
}

interface Props {
    message: ChatMessageParams;
    alreadySubmitted: boolean;
}

export function ContactRequestCard({ message, alreadySubmitted }: Props) {
    const action = message.systemData?.action;
    const status = message.systemData?.status;
    const submitted = alreadySubmitted || status === 'submitted' || status === 'confirmed';

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

    return <ContactRequestForm requestId={message.systemData?.requestId} />;
}

function ContactRequestForm({ requestId }: { requestId?: string }) {
    const [nombre, setNombre] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [poblacion, setPoblacion] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [focused, setFocused] = useState<FieldName | null>(null);
    const [sending, setSending] = useState(false);

    const clearFieldError = (field: FieldName) => {
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

        if (!trimmedNombre) errors.nombre = 'Obligatorio';
        if (!trimmedEmail) errors.email = 'Obligatorio';
        else if (!EMAIL_RE.test(trimmedEmail)) errors.email = 'Introduce un email válido.';
        if (!trimmedTelefono) errors.telefono = 'Obligatorio';
        else if (!PHONE_RE.test(trimmedTelefono)) errors.telefono = 'Introduce un teléfono válido.';

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
                apellidos: apellidos.trim() || undefined,
                poblacion: poblacion.trim() || undefined,
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
                        data: {
                            nombre: nombre.trim(),
                            apellidos: apellidos.trim() || undefined,
                            email: email.trim(),
                            telefono: telefono.trim(),
                            poblacion: poblacion.trim() || undefined,
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

    return (
        <form class="guiders-contact-card" style={cardStyle} onSubmit={onSubmit} noValidate>
            <p style={titleStyle}>Tus datos de contacto</p>
            <p style={subtitleStyle}>Nombre, email y teléfono son obligatorios.</p>

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
                label="Población"
                value={poblacion}
                focused={focused}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setPoblacion}
            />

            {formError && <p style={formErrorStyle}>{formError}</p>}

            <button type="submit" style={sending ? buttonDisabledStyle : buttonStyle} disabled={sending}>
                {sending ? 'Enviando…' : 'Enviar'}
            </button>
        </form>
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
