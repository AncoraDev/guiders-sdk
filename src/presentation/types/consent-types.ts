/**
 * consent-types — configuration types for the cookie/GDPR consent banner.
 *
 * Patches:
 *   #25 (Chunk 2): extracted named aliases (`ConsentBannerStyle`,
 *        `ConsentBannerPosition`, `ConsentBannerColors`) and added a resolved
 *        `InternalConsentBannerConfig` shape mirroring the two-tier pattern
 *        already used by `quick-actions-types.ts`.
 *        All fields marked `readonly` for consistency with #21.
 *   #24 (Chunk 2): added field-level JSDoc documenting defaults and valid
 *        combinations. Defaults reflect intent — they should be reconciled
 *        against the actual ConsentManager implementation.
 */

/**
 * Visual variant of the consent banner.
 *
 * - `'bottom_bar'`: full-width bar anchored to the bottom of the viewport (default).
 * - `'modal'`: centered overlay that blocks interaction until dismissed.
 * - `'corner'`: small floating card in the configured corner.
 * - `'inline'`: rendered inline inside the chat (no global overlay).
 * - `'none'`: no UI; consent must be granted programmatically.
 */
export type ConsentBannerStyle = 'bottom_bar' | 'modal' | 'corner' | 'inline' | 'none';

/** Vertical anchor for `bottom_bar` and `corner` styles. */
export type ConsentBannerPosition = 'bottom' | 'top';

/** Override colors. Any field omitted falls back to the SDK theme. */
export interface ConsentBannerColors {
    /** Banner background color. */
    readonly background?: string;
    /** Body text color. */
    readonly text?: string;
    /** Accept button background color. */
    readonly acceptButton?: string;
    /** Deny button background color. */
    readonly denyButton?: string;
    /** Preferences button background color. */
    readonly preferencesButton?: string;
}

/**
 * User-facing consent-banner configuration.
 *
 * All fields optional — defaults are applied internally by the ConsentManager.
 * See `InternalConsentBannerConfig` for the resolved shape used after defaults.
 *
 * @example
 * new TrackingPixelSDK({
 *     apiKey: 'gds_xxx',
 *     consent: { enabled: true, style: 'bottom_bar' },
 * });
 */
export interface ConsentBannerConfig {
    /** Whether the banner is shown. Default: `false`. */
    readonly enabled?: boolean;
    /** Visual variant. Default: `'bottom_bar'`. */
    readonly style?: ConsentBannerStyle;
    /** Body text. Default: hard-coded Spanish privacy notice. */
    readonly text?: string;
    /** Label of the accept button. Default: `'Aceptar'`. */
    readonly acceptText?: string;
    /** Label of the deny button. Default: `'Rechazar'`. */
    readonly denyText?: string;
    /** Label of the preferences button. Only shown when `showPreferences` is true. Default: `'Preferencias'`. */
    readonly preferencesText?: string;
    /** Whether to show the per-category preferences button. Default: `false`. */
    readonly showPreferences?: boolean;
    /** URL of the privacy policy linked from the banner. Default: none. */
    readonly privacyPolicyUrl?: string;
    /** Color overrides. */
    readonly colors?: ConsentBannerColors;
    /** Vertical anchor for `bottom_bar` and `corner` styles. Default: `'bottom'`. */
    readonly position?: ConsentBannerPosition;
    /** Whether to render an X close button. Default: `false`. */
    readonly showCloseButton?: boolean;
    /** Whether to show the banner automatically on first page load. Default: `true` when `enabled` is true. */
    readonly autoShow?: boolean;
    /** Extra CSS class name applied to the banner root for custom styling. */
    readonly className?: string;
}

/**
 * Resolved consent-banner config — every field has a value after defaults are
 * merged in. This is what the renderer should consume.
 *
 * Note: `privacyPolicyUrl` stays nullable (no sensible default URL exists).
 * Consumers must guard against `null` before linking.
 */
export interface InternalConsentBannerConfig {
    readonly enabled: boolean;
    readonly style: ConsentBannerStyle;
    readonly text: string;
    readonly acceptText: string;
    readonly denyText: string;
    readonly preferencesText: string;
    readonly showPreferences: boolean;
    readonly privacyPolicyUrl: string | null;
    readonly colors: Required<ConsentBannerColors>;
    readonly position: ConsentBannerPosition;
    readonly showCloseButton: boolean;
    readonly autoShow: boolean;
    readonly className: string;
}
