import { useEffect, useRef, useState } from 'preact/hooks';
import { ChatV2Service } from '../../../services/chat-v2-service';
import { LeadCaptureSessionService } from '../../../services/lead-capture-session-service';
import {
    chatIdSignal,
    leadCaptureCompletedSignal,
    leadCaptureFlowSignal,
    leadCaptureModeSignal,
    leadCaptureResumeSignal,
    markLeadCaptureCompleted,
    markLeadCaptureEngaged,
    messagesSignal,
} from '../../signals';
import { isVisibleSignal } from '../../signals/chatState';
import {
    LeadCaptureAnswer,
    LeadCaptureFlowData,
    LeadCaptureProgress,
    LeadCaptureStep,
    ContactFormLegalSnapshot,
    LEAD_CAPTURE_END,
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
    backRowStyle,
    centerCard,
    introBodyStyle,
    optionsColumnStyle,
    progressStyle,
    promptStyle,
    recapAnswerStyle,
    recapCheckStyle,
    recapItemStyle,
    recapListStyle,
    recapMoreStyle,
    stepCounterStyle,
    stepHeaderStyle,
    wizardCardStyle,
} from './LeadCaptureWizard.styles';

const DEFAULT_PRIVACY_LABEL = 'He leído y acepto la política de privacidad';
const COMENTARIOS_MAX = 2000;

type ContactField = 'nombre' | 'email' | 'telefono' | 'comentarios';

const INITIAL_PROGRESS: LeadCaptureProgress = {
    phase: 'intro',
    stepId: null,
    answers: [],
    trail: [],
};

/** Respuestas visibles en el resumen; las anteriores se cuentan en una línea. */
const RECAP_VISIBLE = 3;

/** Móvil: el foco automático abriría el teclado y taparía la pregunta. */
const AUTOFOCUS_MIN_WIDTH_PX = 641;

/** Confirmación visual de la opción elegida antes de pasar al siguiente paso. */
const OPTION_FEEDBACK_MS = 160;

/** El mensaje del backend deja constancia de que la captación ya se completó. */
export function isLeadCaptureMessage(action?: string): boolean {
    return action === 'lead_capture_submission' || action === 'lead_capture_closed';
}

/**
 * Asistente que guía al visitante cuando no hay ningún comercial conectado.
 * Una rama puede pedir datos de contacto (`next` vacío) o cerrarse sin
 * formulario (`__end__`).
 *
 * Dónde se pinta lo decide `leadCaptureModeSignal`:
 * - `offer`: una tarjeta al final del hilo para empezar o reanudar.
 * - `thread`: el guion es el hilo entero y el composer queda bloqueado.
 */
export function LeadCaptureWizard({ centered = false }: { centered?: boolean } = {}) {
    const resolved = leadCaptureFlowSignal.value;
    const mode = leadCaptureModeSignal.value;
    const chatId = chatIdSignal.value;
    // El progreso vive en la señal, no en el componente: al pasar de tarjeta a
    // hilo (y al revés) el asistente se remonta y se perdería lo contestado.
    const current = leadCaptureResumeSignal.value ?? INITIAL_PROGRESS;
    const completed = leadCaptureCompletedSignal.value;

    const flow = resolved?.flow ?? null;
    if (!flow) return null;

    const cardStyle = centered ? centerCard(wizardCardStyle) : wizardCardStyle;
    const centeredText = centered ? { textAlign: 'center' as const } : {};

    // El cierre se pinta en el mensaje del hilo, no al final: si no, lo que
    // escriba el comercial quedaría encima de «Ya está, tenemos tus datos».
    if (completed || mode === 'off') return null;

    const trail = current.trail ?? [];

    const advance = (next: LeadCaptureProgress) => {
        leadCaptureResumeSignal.value = next;
        LeadCaptureSessionService.getInstance().save(chatId, next);
        if (next.phase === 'done') markLeadCaptureCompleted();
    };

    /**
     * Entrar en el guion. Desde la tarjeta de oferta se salta el intro: el
     * visitante ya ha leído de qué va al pulsar.
     */
    const startOrResume = () => {
        markLeadCaptureEngaged();
        if (current.phase === 'intro') {
            advance({
                phase: 'steps',
                stepId: flow.startStepId,
                answers: [],
                trail: [],
            });
        }
    };

    if (mode === 'offer') {
        return (
            <OfferCard
                intro={flow.intro}
                resuming={current.phase !== 'intro'}
                cardStyle={cardStyle}
                centeredText={centeredText}
                onStart={startOrResume}
            />
        );
    }

    /**
     * Vuelve al paso anterior. Lo contestado desde ese punto se descarta: si el
     * visitante cambia de rama, las respuestas de la rama abandonada no pueden
     * acabar en el lead.
     */
    const goBack =
        trail.length === 0
            ? undefined
            : () => {
                  const previousTrail = trail.slice(0, -1);
                  advance({
                      phase: 'steps',
                      stepId: trail[trail.length - 1],
                      answers: current.answers.filter((answer) =>
                          previousTrail.includes(answer.stepId)
                      ),
                      trail: previousTrail,
                  });
              };

    if (current.phase === 'intro') {
        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                <p style={{ ...titleStyle, ...centeredText }}>{flow.intro.title}</p>
                <p style={{ ...introBodyStyle, ...centeredText }}>{flow.intro.body}</p>
                <div style={actionsRowStyle}>
                    <button type="button" style={buttonStyle} onClick={startOrResume}>
                        {flow.intro.ctaLabel}
                    </button>
                </div>
            </div>
        );
    }

    // El paso de datos cuenta como uno más: así el contador nunca promete menos
    // trabajo del que queda.
    const finalStepPosition = trail.length + 1;

    if (current.phase === 'steps') {
        const step = flow.steps.find((candidate) => candidate.id === current.stepId);
        // Un paso que no existe deja el guion sin salida, así que se cierra pidiendo los datos.
        if (!step) {
            return (
                <FinalStep
                    answers={current.answers}
                    legal={resolved?.legal}
                    flowId={flow.id}
                    chatId={chatId}
                    cardStyle={cardStyle}
                    position={finalStepPosition}
                    total={finalStepPosition}
                    onBack={goBack}
                    onDone={() => advance({ ...current, phase: 'done' })}
                />
            );
        }

        return (
            <StepCard
                step={step}
                answers={current.answers}
                cardStyle={cardStyle}
                position={trail.length + 1}
                total={trail.length + stepsAhead(flow, step.id)}
                onBack={goBack}
                onAnswer={(answer, nextStepId) => {
                    const answers = answer
                        ? [...current.answers.filter((a) => a.stepId !== answer.stepId), answer]
                        : current.answers;
                    const nextTrail = [...trail, step.id];
                    if (nextStepId === LEAD_CAPTURE_END) {
                        messagesSignal.value = [
                            ...messagesSignal.value,
                            {
                                id: `lead-capture-closed-${Date.now()}`,
                                text: '',
                                sender: 'system',
                                timestamp: Date.now(),
                                systemData: { action: 'lead_capture_closed' },
                            },
                        ];
                        advance({ phase: 'done', stepId: null, answers, trail: nextTrail });
                        return;
                    }
                    advance(
                        nextStepId
                            ? { phase: 'steps', stepId: nextStepId, answers, trail: nextTrail }
                            : { phase: 'final', stepId: null, answers, trail: nextTrail }
                    );
                }}
            />
        );
    }

    return (
        <FinalStep
            answers={current.answers}
            legal={resolved?.legal}
            flowId={flow.id}
            chatId={chatId}
            cardStyle={cardStyle}
            position={finalStepPosition}
            total={finalStepPosition}
            onBack={goBack}
            onDone={() => advance({ ...current, phase: 'done' })}
        />
    );
}

/**
 * Pasos que quedan como máximo desde aquí. El guion ramifica, así que se toma
 * la rama más larga: el contador puede acortarse al elegir, nunca alargarse.
 */
function stepsAhead(
    flow: LeadCaptureFlowData,
    stepId: string | null | undefined,
    visited: Set<string> = new Set()
): number {
    if (!stepId || visited.has(stepId)) return 0;
    const step = flow.steps.find((candidate) => candidate.id === stepId);
    if (!step) return 0;

    const nextVisited = new Set(visited).add(stepId);
    const exits =
        step.type === 'choice'
            ? (step.options ?? []).map((option) => option.next)
            : [step.next];
    const deepest = exits.reduce((max, next) => {
        if (!next) return Math.max(max, 1);
        if (next === LEAD_CAPTURE_END) return Math.max(max, 0);
        return Math.max(max, stepsAhead(flow, next, nextVisited));
    }, 0);
    return 1 + deepest;
}

/**
 * Tarjeta al final del hilo: el asistente se ofrece sin tapar la conversación
 * ni bloquear el composer. Es también la vía para retomar lo que quedó a medias.
 */
function OfferCard({
    intro,
    resuming,
    cardStyle,
    centeredText,
    onStart,
}: {
    intro: LeadCaptureFlowData['intro'];
    resuming: boolean;
    cardStyle: typeof wizardCardStyle;
    centeredText: { textAlign?: 'center' };
    onStart: () => void;
}) {
    return (
        <div class="guiders-lead-capture" style={cardStyle}>
            <p style={{ ...titleStyle, ...centeredText }}>
                {resuming ? 'Tienes una solicitud a medias' : intro.title}
            </p>
            <p style={{ ...introBodyStyle, ...centeredText }}>
                {resuming
                    ? 'Sigue donde lo dejaste y te contactamos con una propuesta.'
                    : intro.body}
            </p>
            <div style={actionsRowStyle}>
                <button type="button" style={buttonStyle} onClick={onStart}>
                    {resuming ? 'Continuar' : intro.ctaLabel}
                </button>
            </div>
        </div>
    );
}

/** Cabecera de progreso: orienta sobre lo que falta antes de pedir los datos. */
function StepProgress({ position, total }: { position: number; total: number }) {
    const percent = Math.min(100, Math.round((position / Math.max(total, 1)) * 100));
    return (
        <div style={stepHeaderStyle}>
            <span style={stepCounterStyle}>
                Paso {position} de {total}
            </span>
            <div
                class="guiders-lc-progress-track"
                role="progressbar"
                aria-label="Progreso del asistente"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={position}
            >
                <div class="guiders-lc-progress-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

/** Vuelta al paso anterior; se oculta en el primero, donde no hay dónde volver. */
function BackButton({ onBack }: { onBack?: () => void }) {
    if (!onBack) return null;
    return (
        <div style={backRowStyle}>
            <button type="button" class="guiders-lc-back" onClick={onBack}>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    width="12"
                    height="12"
                    aria-hidden="true"
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Atrás
            </button>
        </div>
    );
}

/** Cierre del guion: se pinta en el sitio del mensaje de envío. */
export function ThanksCard({
    centered = false,
    withoutContact = false,
}: {
    centered?: boolean;
    withoutContact?: boolean;
}) {
    return (
        <div
            class="guiders-lead-capture"
            style={centered ? centerCard(doneCardStyle) : doneCardStyle}
            role="status"
        >
            <span style={doneCheckStyle} aria-hidden="true">✓</span>
            <p style={titleStyle}>
                {withoutContact ? 'Listo, gracias' : 'Muchas gracias.'}
            </p>
            <p style={doneHintStyle}>
                {withoutContact
                    ? 'Cuando haya un asesor disponible podrás seguir la conversación. No hemos pedido tus datos.'
                    : 'En breve una persona del equipo se pondrá en contacto contigo ;)'}
            </p>
        </div>
    );
}

function AnswersRecap({ answers }: { answers: LeadCaptureAnswer[] }) {
    if (answers.length === 0) return null;
    // Solo las últimas: con el guion avanzado el resumen taparía la pregunta.
    const visible = answers.slice(-RECAP_VISIBLE);
    const hidden = answers.length - visible.length;
    return (
        <div style={recapListStyle}>
            {hidden > 0 && (
                <p style={recapMoreStyle}>
                    +{hidden} {hidden === 1 ? 'respuesta' : 'respuestas'} antes
                </p>
            )}
            {visible.map((answer) => (
                <p key={answer.stepId} style={recapItemStyle}>
                    <span style={recapCheckStyle} aria-hidden="true">✓</span>
                    <span>
                        {answer.prompt}{' '}
                        <span style={recapAnswerStyle}>{answer.answer}</span>
                    </span>
                </p>
            ))}
        </div>
    );
}

function StepCard({
    step,
    answers,
    cardStyle,
    position,
    total,
    onBack,
    onAnswer,
}: {
    step: LeadCaptureStep;
    answers: LeadCaptureAnswer[];
    cardStyle: typeof wizardCardStyle;
    position: number;
    total: number;
    onBack?: () => void;
    onAnswer: (answer: LeadCaptureAnswer | null, nextStepId: string | null) => void;
}) {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState('');
    const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const feedbackTimer = useRef<number | null>(null);

    // Cada paso empieza con el campo limpio aunque se reutilice el componente.
    useEffect(() => {
        setValue('');
        setError('');
        setChosenOptionId(null);
    }, [step.id]);

    // El teclado solo se abre solo en pantalla grande: en móvil taparía la
    // pregunta que el visitante acaba de recibir.
    useEffect(() => {
        if (step.type !== 'text') return;
        if (!isVisibleSignal.peek()) return;
        if (window.innerWidth < AUTOFOCUS_MIN_WIDTH_PX) return;
        inputRef.current?.focus();
    }, [step.id, step.type]);

    useEffect(
        () => () => {
            if (feedbackTimer.current !== null) {
                window.clearTimeout(feedbackTimer.current);
            }
        },
        []
    );

    const header = (
        <>
            <StepProgress position={position} total={total} />
            <AnswersRecap answers={answers} />
        </>
    );

    if (step.type === 'message') {
        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                {header}
                <div class="guiders-lc-step" key={step.id}>
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
                <BackButton onBack={onBack} />
            </div>
        );
    }

    if (step.type === 'choice') {
        /** La opción elegida se marca un instante antes de avanzar. */
        const choose = (optionId: string, answer: LeadCaptureAnswer, next: string | null) => {
            if (chosenOptionId) return;
            setChosenOptionId(optionId);
            feedbackTimer.current = window.setTimeout(
                () => onAnswer(answer, next),
                OPTION_FEEDBACK_MS
            );
        };

        return (
            <div class="guiders-lead-capture" style={cardStyle}>
                {header}
                <div class="guiders-lc-step" key={step.id}>
                    <p style={promptStyle}>{step.prompt}</p>
                    <div style={optionsColumnStyle}>
                        {(step.options ?? []).map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                class={`guiders-lc-option${
                                    chosenOptionId === option.id
                                        ? ' guiders-lc-option--chosen'
                                        : ''
                                }`}
                                disabled={!!chosenOptionId}
                                onClick={() =>
                                    choose(
                                        option.id,
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
                                <span>{option.label}</span>
                                <svg
                                    class="guiders-lc-option-arrow"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    width="14"
                                    height="14"
                                    aria-hidden="true"
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
                <BackButton onBack={onBack} />
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
            {header}
            <div class="guiders-lc-step" key={step.id}>
                <p style={promptStyle}>{step.prompt}</p>
                <label style={fieldStyle}>
                    <span style={optional ? optionalLabelStyle : requiredLabelStyle}>
                        {optional ? 'Tu respuesta (opcional)' : 'Tu respuesta'}
                    </span>
                    <input
                        ref={inputRef}
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
            </div>
            <BackButton onBack={onBack} />
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
    position,
    total,
    onBack,
    onDone,
}: {
    answers: LeadCaptureAnswer[];
    legal?: ContactFormLegalSnapshot;
    flowId: string;
    chatId: string | null;
    cardStyle: typeof wizardCardStyle;
    position: number;
    total: number;
    onBack?: () => void;
    onDone: () => void;
}) {
    const prefill = prefillFromAnswers(answers);
    const [nombre, setNombre] = useState(prefill.nombre ?? '');
    const [email, setEmail] = useState(prefill.email ?? '');
    const [telefono, setTelefono] = useState(prefill.telefono ?? '');
    const [comentarios, setComentarios] = useState(prefill.comentarios ?? '');
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<ContactField | 'privacy', string>>>({});
    const [formError, setFormError] = useState('');
    const [focused, setFocused] = useState<ContactField | null>(null);
    const [sending, setSending] = useState(false);

    const validate = () => {
        const next: Partial<Record<ContactField | 'privacy', string>> = {};
        const trimmedEmail = email.trim();
        const trimmedTelefono = telefono.trim();
        const trimmedComentarios = comentarios.trim();

        if (!nombre.trim()) next.nombre = 'Obligatorio';
        if (!trimmedEmail) next.email = 'Obligatorio';
        else if (!EMAIL_RE.test(trimmedEmail)) next.email = 'Introduce un email válido.';
        if (!trimmedTelefono) next.telefono = 'Obligatorio';
        else if (!PHONE_RE.test(trimmedTelefono)) {
            next.telefono = 'Introduce un teléfono válido.';
        }
        if (!trimmedComentarios) next.comentarios = 'Obligatorio';
        else if (trimmedComentarios.length > COMENTARIOS_MAX) {
            next.comentarios = `Máximo ${COMENTARIOS_MAX} caracteres.`;
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
                email: email.trim(),
                telefono: telefono.trim(),
                comentarios: comentarios.trim(),
                acceptedPrivacyPolicy: true,
                answers,
            });
            LeadCaptureSessionService.getInstance().clear(chatId);
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
            <StepProgress position={position} total={total} />
            <AnswersRecap answers={answers} />
            <p style={titleStyle}>Último paso: tus datos</p>
            <p style={subtitleStyle}>
                Nombre, email, teléfono y comentarios. Todos obligatorios.
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
                name="email"
                label="Email *"
                type="email"
                required
                value={email}
                focused={focused}
                error={errors.email}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setEmail}
            />
            <ContactInput
                name="telefono"
                label="Teléfono *"
                type="tel"
                required
                value={telefono}
                focused={focused}
                error={errors.telefono}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setTelefono}
            />
            <ContactInput
                name="comentarios"
                label="Comentarios *"
                type="textarea"
                required
                value={comentarios}
                focused={focused}
                error={errors.comentarios}
                onFocus={setFocused}
                onBlur={() => setFocused(null)}
                onInput={setComentarios}
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
            <BackButton onBack={onBack} />
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
    const inputStyle = resolveInputStyle({ focused: focused === name, invalid: !!error });
    const controlStyle =
        type === 'textarea'
            ? { ...inputStyle, minHeight: '88px', resize: 'vertical' as const }
            : inputStyle;
    return (
        <label style={fieldStyle} for={fieldId}>
            <span style={required ? requiredLabelStyle : optionalLabelStyle}>{label}</span>
            {type === 'textarea' ? (
                <textarea
                    id={fieldId}
                    value={value}
                    rows={4}
                    maxlength={COMENTARIOS_MAX}
                    style={controlStyle}
                    onFocus={() => onFocus(name)}
                    onBlur={onBlur}
                    onInput={(event) => onInput((event.target as HTMLTextAreaElement).value)}
                />
            ) : (
                <input
                    id={fieldId}
                    type={type}
                    value={value}
                    autocomplete="off"
                    style={controlStyle}
                    onFocus={() => onFocus(name)}
                    onBlur={onBlur}
                    onInput={(event) => onInput((event.target as HTMLInputElement).value)}
                />
            )}
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
    const fields: ContactField[] = ['nombre', 'email', 'telefono', 'comentarios'];
    answers.forEach((answer) => {
        const raw = answer.field === 'comentario' ? 'comentarios' : answer.field;
        const field = raw as ContactField | undefined;
        if (field && fields.includes(field)) {
            prefill[field] = answer.answer;
        }
    });
    return prefill;
}
