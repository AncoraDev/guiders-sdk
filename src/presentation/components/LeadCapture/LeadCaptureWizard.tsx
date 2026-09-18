import { useEffect, useRef, useState } from 'preact/hooks';
import { ChatV2Service } from '../../../services/chat-v2-service';
import {
    chatIdSignal,
    leadCaptureActiveSignal,
    leadCaptureFlowSignal,
    leadCaptureStartedSignal,
    messagesSignal,
} from '../../signals';
import {
    LeadCaptureAnswer,
    LeadCaptureStep,
    ContactFormLegalSnapshot,
} from '../../../types';
import {
    actionsRowStyle,
    buttonDisabledStyle,
    buttonStyle,
    checkboxInputStyle,
    checkboxLinkStyle,
    checkboxRowStyle,
    doneCardStyle,
    doneCheckStyle,
    doneHintStyle,
    fieldErrorStyle,
    fieldStyle,
    formErrorStyle,
    optionalLabelStyle,
    requiredLabelStyle,
    resolveInputStyle,
    subtitleStyle,
    titleStyle,
} from '../ChatMessages/ContactRequestCard.styles';
import { EMAIL_RE, PHONE_RE } from '../ChatMessages/contact-validation';
import {
    centerCard,
    introBodyStyle,
    optionButtonStyle,
    optionsColumnStyle,
    progressStyle,
    promptStyle,
    recapAnswerStyle,
    recapItemStyle,
    recapListStyle,
    wizardCardStyle,
} from './LeadCaptureWizard.styles';

const STORAGE_PREFIX = 'guiders_lead_capture_';

const DEFAULT_PRIVACY_LABEL = 'He leído y acepto la política de privacidad';
const DEFAULT_MARKETING_LABEL = 'Acepto recibir comunicaciones';

type Phase = 'intro' | 'steps' | 'final' | 'done';

type ContactField = 'nombre' | 'apellidos' | 'email' | 'telefono' | 'poblacion';

interface WizardProgress {
    phase: Phase;
    stepId: string | null;
    answers: LeadCaptureAnswer[];
}

const INITIAL_PROGRESS: WizardProgress = {
    phase: 'intro',
    stepId: null,
    answers: [],
};

/** El mensaje del backend deja constancia de que la captación ya se completó. */
export function isLeadCaptureMessage(action?: string): boolean {
    return action === 'lead_capture_submission';
}

/**
 * Asistente que guía al visitante hasta dejar sus datos cuando no hay ningún
 * comercial conectado. El paso final siempre pide los datos de contacto y el
 * consentimiento, así que un guion mal montado nunca produce un lead inservible.
 */
export function LeadCaptureWizard({ centered = false }: { centered?: boolean } = {}) {
    const resolved = leadCaptureFlowSignal.value;
    const active = leadCaptureActiveSignal.value;
    const chatId = chatIdSignal.value;
    const messages = messagesSignal.value;

    const [progress, setProgress] = useState<WizardProgress>(INITIAL_PROGRESS);
    const hydratedChatId = useRef<string | null>(null);

    // El progreso vive en sessionStorage para que un recargo no obligue a
    // empezar de nuevo el guion.
    useEffect(() => {
        if (!chatId || hydratedChatId.current === chatId) return;
        hydratedChatId.current = chatId;
        const stored = readProgress(chatId);
        if (stored) {
            setProgress(stored);
            if (stored.phase !== 'intro') leadCaptureStartedSignal.value = true;
        }
    }, [chatId]);

    const flow = resolved?.flow ?? null;
    if (!flow || !active) return null;

    const cardStyle = centered ? centerCard(wizardCardStyle) : wizardCardStyle;
    const centeredText = centered ? { textAlign: 'center' as const } : {};

    const alreadySubmitted = messages.some((msg) =>
        isLeadCaptureMessage(msg.systemData?.action)
    );

    if (alreadySubmitted || progress.phase === 'done') {
        return <ThanksCard centered={centered} />;
    }

    const advance = (next: WizardProgress) => {
        setProgress(next);
        writeProgress(chatId, next);
    };

    if (progress.phase === 'intro') {
        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                <p style={{ ...titleStyle, ...centeredText }}>{flow.intro.title}</p>
                <p style={{ ...introBodyStyle, ...centeredText }}>{flow.intro.body}</p>
                <div style={actionsRowStyle}>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => {
                            leadCaptureStartedSignal.value = true;
                            advance({
                                phase: 'steps',
                                stepId: flow.startStepId,
                                answers: [],
                            });
                        }}
                    >
                        {flow.intro.ctaLabel}
                    </button>
                </div>
            </div>
        );
    }

    if (progress.phase === 'steps') {
        const step = flow.steps.find((candidate) => candidate.id === progress.stepId);
        // Un paso que no existe deja el guion sin salida, así que se cierra pidiendo los datos.
        if (!step) {
            return (
                <FinalStep
                    answers={progress.answers}
                    legal={resolved?.legal}
                    flowId={flow.id}
                    chatId={chatId}
                    cardStyle={cardStyle}
                    onDone={() => advance({ ...progress, phase: 'done' })}
                />
            );
        }

        return (
            <StepCard
                step={step}
                answers={progress.answers}
                cardStyle={cardStyle}
                onAnswer={(answer, nextStepId) => {
                    const answers = answer
                        ? [...progress.answers.filter((a) => a.stepId !== answer.stepId), answer]
                        : progress.answers;
                    advance(
                        nextStepId
                            ? { phase: 'steps', stepId: nextStepId, answers }
                            : { phase: 'final', stepId: null, answers }
                    );
                }}
            />
        );
    }

    return (
        <FinalStep
            answers={progress.answers}
            legal={resolved?.legal}
            flowId={flow.id}
            chatId={chatId}
            cardStyle={cardStyle}
            onDone={() => advance({ ...progress, phase: 'done' })}
        />
    );
}

function ThanksCard({ centered = false }: { centered?: boolean }) {
    return (
        <div
            class="guiders-lead-capture"
            style={centered ? centerCard(doneCardStyle) : doneCardStyle}
            role="status"
        >
            <span style={doneCheckStyle} aria-hidden="true">✓</span>
            <p style={titleStyle}>Ya está, tenemos tus datos</p>
            <p style={doneHintStyle}>
                Un asesor revisará lo que nos has contado y te escribirá el
                próximo día laborable con una respuesta concreta.
            </p>
        </div>
    );
}

function AnswersRecap({ answers }: { answers: LeadCaptureAnswer[] }) {
    if (answers.length === 0) return null;
    return (
        <div style={recapListStyle}>
            {answers.map((answer) => (
                <p key={answer.stepId} style={recapItemStyle}>
                    {answer.prompt}{' '}
                    <span style={recapAnswerStyle}>{answer.answer}</span>
                </p>
            ))}
        </div>
    );
}

function StepCard({
    step,
    answers,
    cardStyle,
    onAnswer,
}: {
    step: LeadCaptureStep;
    answers: LeadCaptureAnswer[];
    cardStyle: typeof wizardCardStyle;
    onAnswer: (answer: LeadCaptureAnswer | null, nextStepId: string | null) => void;
}) {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState('');

    // Cada paso empieza con el campo limpio aunque se reutilice el componente.
    useEffect(() => {
        setValue('');
        setError('');
    }, [step.id]);

    if (step.type === 'message') {
        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                <AnswersRecap answers={answers} />
                <p style={promptStyle}>{step.prompt}</p>
                <div style={actionsRowStyle}>
                    <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => onAnswer(null, step.next ?? null)}
                    >
                        Continuar
                    </button>
                </div>
            </div>
        );
    }

    if (step.type === 'choice') {
        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                <AnswersRecap answers={answers} />
                <p style={promptStyle}>{step.prompt}</p>
                <div style={optionsColumnStyle}>
                    {(step.options ?? []).map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            style={optionButtonStyle}
                            onClick={() =>
                                onAnswer(
                                    {
                                        stepId: step.id,
                                        prompt: step.prompt,
                                        answer: option.label,
                                        field: step.field,
                                    },
                                    option.next ?? null
                                )
                            }
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const submit = (event: Event) => {
        event.preventDefault();
        const trimmed = value.trim();
        const validationError = validateText(step, trimmed);
        if (validationError) {
            setError(validationError);
            return;
        }
        onAnswer(
            trimmed
                ? {
                      stepId: step.id,
                      prompt: step.prompt,
                      answer: trimmed,
                      field: step.field,
                  }
                : null,
            step.next ?? null
        );
    };

    const optional = step.required === false;
    return (
        <form class="guiders-lead-capture" style={cardStyle} onSubmit={submit} noValidate>
            <AnswersRecap answers={answers} />
            <p style={promptStyle}>{step.prompt}</p>
            <label style={fieldStyle}>
                <span style={optional ? optionalLabelStyle : requiredLabelStyle}>
                    {optional ? 'Tu respuesta (opcional)' : 'Tu respuesta'}
                </span>
                <input
                    type={step.validation === 'email' ? 'email' : step.validation === 'phone' ? 'tel' : 'text'}
                    value={value}
                    autocomplete="off"
                    style={resolveInputStyle({ focused, invalid: !!error })}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onInput={(event) => {
                        setValue((event.target as HTMLInputElement).value);
                        setError('');
                    }}
                />
                {error && <p style={fieldErrorStyle}>{error}</p>}
            </label>
            <div style={actionsRowStyle}>
                <button type="submit" style={buttonStyle}>
                    Continuar
                </button>
            </div>
        </form>
    );
}

function validateText(step: LeadCaptureStep, value: string): string {
    if (!value) {
        return step.required === false ? '' : 'Obligatorio';
    }
    if (step.validation === 'email' && !EMAIL_RE.test(value)) {
        return 'Introduce un email válido.';
    }
    if (step.validation === 'phone' && !PHONE_RE.test(value)) {
        return 'Introduce un teléfono válido.';
    }
    return '';
}

/**
 * Paso final fijo: los datos que necesita el comercial para devolver la
 * llamada, más el consentimiento con los textos legales de la empresa.
 */
function FinalStep({
    answers,
    legal,
    flowId,
    chatId,
    cardStyle,
    onDone,
}: {
    answers: LeadCaptureAnswer[];
    legal?: ContactFormLegalSnapshot;
    flowId: string;
    chatId: string | null;
    cardStyle: typeof wizardCardStyle;
    onDone: () => void;
}) {
    const prefill = prefillFromAnswers(answers);
    const [nombre, setNombre] = useState(prefill.nombre ?? '');
    const [apellidos, setApellidos] = useState(prefill.apellidos ?? '');
    const [email, setEmail] = useState(prefill.email ?? '');
    const [telefono, setTelefono] = useState(prefill.telefono ?? '');
    const [poblacion, setPoblacion] = useState(prefill.poblacion ?? '');
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [acceptedMarketing, setAcceptedMarketing] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<ContactField | 'privacy', string>>>({});
    const [formError, setFormError] = useState('');
    const [focused, setFocused] = useState<ContactField | null>(null);
    const [sending, setSending] = useState(false);

    const validate = () => {
        const next: Partial<Record<ContactField | 'privacy', string>> = {};
        const trimmedEmail = email.trim();
        const trimmedTelefono = telefono.trim();

        if (!nombre.trim()) next.nombre = 'Obligatorio';
        if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
            next.email = 'Introduce un email válido.';
        }
        if (trimmedTelefono && !PHONE_RE.test(trimmedTelefono)) {
            next.telefono = 'Introduce un teléfono válido.';
        }
        if (!trimmedEmail && !trimmedTelefono) {
            next.email = 'Necesitamos un email o un teléfono.';
        }
        if (!acceptedPrivacy) {
            next.privacy = 'Debes aceptar la política de privacidad';
        }
        return next;
    };

    const submit = async (event: Event) => {
        event.preventDefault();
        const validation = validate();
        setErrors(validation);
        setFormError('');
        if (Object.keys(validation).length > 0) return;

        if (!chatId) {
            setFormError('No hay chat activo.');
            return;
        }

        setSending(true);
        try {
            const message = await ChatV2Service.getInstance().submitLeadCapture(chatId, {
                flowId,
                nombre: nombre.trim(),
                apellidos: apellidos.trim() || undefined,
                email: email.trim() || undefined,
                telefono: telefono.trim() || undefined,
                poblacion: poblacion.trim() || undefined,
                acceptedPrivacyPolicy: true,
                acceptedMarketing,
                answers,
            });
            clearProgress(chatId);
            // El resumen queda en el hilo, así que el estado sobrevive a un recargo.
            if (message?.id) {
                messagesSignal.value = [
                    ...messagesSignal.value,
                    {
                        id: message.id,
                        text: '',
                        sender: 'system',
                        timestamp: Date.now(),
                        systemData: { action: 'lead_capture_submission' },
                    },
                ];
            }
            onDone();
        } catch {
            setFormError('No se pudieron enviar tus datos. Inténtalo de nuevo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <form class="guiders-lead-capture" style={cardStyle} onSubmit={submit} noValidate>
            <AnswersRecap answers={answers} />
            <p style={titleStyle}>Último paso: ¿dónde te respondemos?</p>
            <p style={subtitleStyle}>
                Con tu nombre y un email o teléfono basta. Te escribimos el próximo
                día laborable con una propuesta hecha para tu caso.
            </p>

            <ContactInput
                name="nombre"
                label="Nombre *"
                required
                value={nombre}
                focused={focused}
                error={errors.nombre}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setNombre}
            />
            <ContactInput
                name="apellidos"
                label="Apellidos"
                value={apellidos}
                focused={focused}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setApellidos}
            />
            <ContactInput
                name="email"
                label="Email"
                type="email"
                value={email}
                focused={focused}
                error={errors.email}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setEmail}
            />
            <ContactInput
                name="telefono"
                label="Teléfono"
                type="tel"
                value={telefono}
                focused={focused}
                error={errors.telefono}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setTelefono}
            />
            <ContactInput
                name="poblacion"
                label="Población"
                value={poblacion}
                focused={focused}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setPoblacion}
            />

            <label style={checkboxRowStyle}>
                <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    required
                    style={checkboxInputStyle}
                    onChange={(event) =>
                        setAcceptedPrivacy((event.target as HTMLInputElement).checked)
                    }
                />
                <span>
                    <PrivacyLabel
                        text={legal?.privacyCheckboxLabel || DEFAULT_PRIVACY_LABEL}
                        url={legal?.privacyPolicyUrl}
                    />
                    {errors.privacy && <p style={fieldErrorStyle}>{errors.privacy}</p>}
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
                <span>{legal?.marketingCheckboxLabel || DEFAULT_MARKETING_LABEL}</span>
            </label>

            {formError && <p style={formErrorStyle}>{formError}</p>}

            <div style={actionsRowStyle}>
                <button
                    type="submit"
                    style={sending ? buttonDisabledStyle : buttonStyle}
                    disabled={sending}
                >
                    {sending ? 'Enviando…' : 'Quiero que me contacten'}
                </button>
            </div>
            <p style={progressStyle}>
                Tus respuestas se guardan junto a tus datos de contacto.
            </p>
        </form>
    );
}

function ContactInput({
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
    name: ContactField;
    label: string;
    type?: string;
    required?: boolean;
    value: string;
    focused: ContactField | null;
    error?: string;
    onFocus: (name: ContactField) => void;
    onBlur: () => void;
    onInput: (value: string) => void;
}) {
    const fieldId = `gds-lead-capture-${name}`;
    return (
        <label style={fieldStyle} for={fieldId}>
            <span style={required ? requiredLabelStyle : optionalLabelStyle}>{label}</span>
            <input
                id={fieldId}
                type={type}
                value={value}
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

function PrivacyLabel({ text, url }: { text: string; url?: string }) {
    const href = url?.trim();
    if (!href) return <>{text}</>;

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

/** Lo que el guion ya preguntó no se vuelve a pedir en blanco. */
function prefillFromAnswers(
    answers: LeadCaptureAnswer[]
): Partial<Record<ContactField, string>> {
    const prefill: Partial<Record<ContactField, string>> = {};
    const fields: ContactField[] = ['nombre', 'apellidos', 'email', 'telefono', 'poblacion'];
    answers.forEach((answer) => {
        const field = answer.field as ContactField | undefined;
        if (field && fields.includes(field)) {
            prefill[field] = answer.answer;
        }
    });
    return prefill;
}

function storageKey(chatId: string): string {
    return `${STORAGE_PREFIX}${chatId}`;
}

function readProgress(chatId: string): WizardProgress | null {
    try {
        const raw = sessionStorage?.getItem(storageKey(chatId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as WizardProgress;
        if (!parsed?.phase) return null;
        return { ...INITIAL_PROGRESS, ...parsed };
    } catch {
        return null;
    }
}

function writeProgress(chatId: string | null, progress: WizardProgress): void {
    if (!chatId) return;
    try {
        sessionStorage?.setItem(storageKey(chatId), JSON.stringify(progress));
    } catch {
        /* el asistente sigue funcionando sin persistencia */
    }
}

function clearProgress(chatId: string): void {
    try {
        sessionStorage?.removeItem(storageKey(chatId));
    } catch {
        /* nada que limpiar */
    }
}
