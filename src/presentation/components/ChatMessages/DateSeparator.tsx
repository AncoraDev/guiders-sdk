import { useState, useEffect } from 'preact/hooks';
import { formatDate } from '../../utils/chat-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateSeparatorProps {
    date?: Date;
    /** 'date' | 'handoff' | 'transfer' */
    type?: 'date' | 'handoff' | 'transfer';
    /** Used when type='handoff' | 'transfer' */
    label?: string;
    /** Optional time (HH:mm) for transfer pill */
    timeLabel?: string;
}

// ---------------------------------------------------------------------------
// Shared line style (tokens only, no hardcoded colors)
// ---------------------------------------------------------------------------

const lineStyle = {
    flex: 1,
    height: '1px',
    background: 'var(--gds-color-border)',
    minWidth: '12px',
};

const usersIconSvg = (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

// ---------------------------------------------------------------------------
// DateSeparator
// ---------------------------------------------------------------------------

/**
 * DateSeparator — Story 6.5 + transfer marker:
 *   - type='date'     → formatted date label
 *   - type='handoff'  → handoff notice with fade-in
 *   - type='transfer' → pill marker (mismo patrón visual que Console)
 */
export function DateSeparator({
    date,
    type = 'date',
    label,
    timeLabel,
}: DateSeparatorProps) {
    const [opacity, setOpacity] = useState(
        type === 'handoff' || type === 'transfer' ? 0 : 1,
    );
    useEffect(() => {
        if (type === 'handoff' || type === 'transfer') {
            const t = setTimeout(() => setOpacity(1), 16);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [type]);

    if (type === 'transfer') {
        const text = label ?? 'Chat transferido';
        return (
            <div
                class="chat-date-separator chat-transfer-marker"
                role="status"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '6px 0',
                    width: '100%',
                    opacity,
                    transition: 'opacity 200ms ease',
                }}
            >
                <div style={lineStyle} />
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        maxWidth: 'min(100%, 28rem)',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background:
                            'color-mix(in srgb, var(--gds-color-success, #16a34a) 14%, var(--gds-color-bg-elevated, #fff))',
                        color: 'var(--gds-color-text-secondary)',
                        border:
                            '1px solid color-mix(in srgb, var(--gds-color-success, #16a34a) 28%, var(--gds-color-border))',
                        fontSize: '11px',
                        fontWeight: 500,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            color: 'var(--gds-color-success, #16a34a)',
                            flexShrink: 0,
                        }}
                    >
                        {usersIconSvg}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {text}
                    </span>
                    {timeLabel && (
                        <span
                            style={{
                                flexShrink: 0,
                                marginLeft: '2px',
                                color: 'var(--gds-color-text-tertiary)',
                                fontWeight: 400,
                            }}
                        >
                            {timeLabel}
                        </span>
                    )}
                </span>
                <div style={lineStyle} />
            </div>
        );
    }

    const displayLabel = type === 'handoff'
        ? (label ?? 'Agente se ha unido')
        : (date ? formatDate(date) : '');

    return (
        <div
            class="chat-date-separator"
            data-date={displayLabel}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: type === 'handoff' ? '8px 0' : '16px 0',
                opacity,
                transition: type === 'handoff' ? 'opacity 200ms ease' : undefined,
            }}
        >
            <div style={lineStyle} />
            <span
                style={{
                    color: 'var(--gds-color-text-secondary)',
                    fontSize: type === 'handoff' ? '12px' : '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    letterSpacing: type === 'date' ? '0.05em' : '0.01em',
                    textTransform: type === 'date' ? 'uppercase' : 'none',
                }}
            >
                {displayLabel}
            </span>
            <div style={lineStyle} />
        </div>
    );
}
