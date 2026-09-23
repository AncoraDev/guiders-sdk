import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';
import { requireWordPress } from './utils/env';

/**
 * WordPress smoke tests — verifies that the Preact-migrated SDK works
 * correctly when loaded from the WordPress plugin (guiders-sdk.min.js),
 * with the full GUIDERS_CONFIG injected by the plugin.
 *
 * Key constraints from the WP config:
 *  - preventAutoInit: "1" → SDK does NOT boot automatically; the inline
 *    script at the bottom of the page must call initGuiders() manually.
 *  - requireConsent: "1" → GDPR consent banner must be accepted before
 *    the chat fully initializes.
 *  - consentBanner.enabled: false → the SDK's own banner is off; WP
 *    uses a 3rd-party GDPR plugin (moove_gdpr_frontend). We bypass by
 *    pre-seeding the moove_gdpr_popup cookie BEFORE navigation so that
 *    setupMooveGDPRSync() → readMooveConsent() picks it up and calls
 *    grantConsentWithPreferences() automatically once window.guiders exists.
 *  - activeHours.enabled: false → chat is always available.
 *  - quickActions.enabled: true → welcome message + 4 action buttons.
 *
 * BotDetector mitigation: see preact-components.spec.ts for rationale.
 *
 * Consent flow (why addInitScript + localStorage alone does NOT work):
 *   1. addInitScript seeds localStorage.
 *   2. WP inline script detects Moove GDPR → CLEARS localStorage
 *      ('guiders_consent_state') so the SDK starts with state 'pending'.
 *   3. doInit() creates window.guiders with requireConsent:true.
 *   4. syncMooveToGuiders() retries until window.guiders exists, then
 *      reads the moove_gdpr_popup COOKIE and calls grantConsentWithPreferences().
 *   → Pre-seeding the cookie (via context.addCookies before goto) is the
 *     correct bypass that survives the localStorage wipe.
 */

const WP_URL = 'http://localhost:8090';

/** Cookie value for moove_gdpr_popup — all categories accepted (string "1" format). */
const MOOVE_CONSENT_COOKIE = encodeURIComponent(
    JSON.stringify({ strict: '1', thirdparty: '1', advanced: '1', performance: '1', preference: '1' })
);

/** Pierce the SDK Shadow DOM mounted at #guiders-chat-widget. */
function shadow(page: Page, selector: string): Locator {
    return page.locator(`#guiders-chat-widget ${selector}`);
}

/**
 * Navigate to WP homepage with consent pre-seeded via cookie, wait for
 * window.guiders to be fully initialized and Shadow DOM to hydrate.
 */
async function gotoWP(page: Page): Promise<void> {
    // Seed the Moove GDPR cookie BEFORE navigation so readMooveConsent()
    // finds it and calls grantConsentWithPreferences() after SDK init.
    const ctx: BrowserContext = page.context();
    await ctx.addCookies([{
        name:   'moove_gdpr_popup',
        value:  MOOVE_CONSENT_COOKIE,
        domain: 'localhost',
        path:   '/',
    }]);

    // Pre-seed consent state AND intercept localStorage.removeItem to prevent
    // the WP inline script from wiping guiders_consent_state before doInit().
    // This ensures the SDK sees 'granted' status on first init() call, so
    // grantConsentWithPreferences() from syncMooveToGuiders() becomes a no-op
    // (consent is already granted → init() guard blocks re-entry).
    await page.addInitScript(() => {
        try {
            localStorage.setItem('guiders_consent_state', JSON.stringify({
                granted: true, status: 'granted', timestamp: Date.now(), version: '1.0'
            }));
            localStorage.setItem('guiders_consent', 'true');

            // Block the WP script from removing our pre-seeded consent state.
            const origRemove = localStorage.removeItem.bind(localStorage);
            localStorage.removeItem = function(key: string) {
                if (key === 'guiders_consent_state' || key === 'guiders_consent') return;
                origRemove(key);
            };
        } catch { /* sandboxed */ }
    });

    await page.goto(WP_URL, { waitUntil: 'networkidle' });

    // BotDetector mitigation — flip "behavior" check to human.
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 310);

    // Wait for window.guiders AND consent to be granted.
    // The addInitScript guard on localStorage.removeItem ensures the SDK sees
    // status:'granted' on first init(), so syncMooveToGuiders() finds consent
    // already set and skips calling grantConsentWithPreferences() / init().
    await page.waitForFunction(() => {
        const g = (window as any).guiders;
        return Boolean(g) && typeof g.isConsentGranted === 'function' && g.isConsentGranted() === true;
    }, { timeout: 25000 });

    // Wait for Preact Shadow DOM to hydrate.
    await page.waitForTimeout(600);
}

/**
 * Navigate to an arbitrary WP page URL (used by the stability test).
 * Assumes the Moove cookie is already set on the context.
 */
async function gotoWPUrl(page: Page, url: string): Promise<void> {
    // Re-seed the localStorage guard for subsequent navigations.
    await page.addInitScript(() => {
        try {
            localStorage.setItem('guiders_consent_state', JSON.stringify({
                granted: true, status: 'granted', timestamp: Date.now(), version: '1.0'
            }));
            localStorage.setItem('guiders_consent', 'true');
            const origRemove = localStorage.removeItem.bind(localStorage);
            localStorage.removeItem = function(key: string) {
                if (key === 'guiders_consent_state' || key === 'guiders_consent') return;
                origRemove(key);
            };
        } catch { /* sandboxed */ }
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.mouse.move(300, 300);
    await page.waitForFunction(() => {
        const g = (window as any).guiders;
        return Boolean(g) && typeof g.isConsentGranted === 'function' && g.isConsentGranted() === true;
    }, { timeout: 25000 });
    await page.waitForTimeout(400);
}

test.describe('WordPress — SDK smoke tests', () => {
    test.beforeEach(async () => {
        requireWordPress();
    });

    // ------------------------------------------------------------------ //
    // 1. SDK boots correctly in WordPress context
    // ------------------------------------------------------------------ //
    test('SDK initializes and exposes public API', async ({ page }) => {
        await gotoWP(page);

        const api = await page.evaluate(() => {
            const g = (window as any).guiders;
            return {
                hasGuiders:          typeof g === 'object' && g !== null,
                hasShowChat:         typeof g.showChat === 'function',
                hasHideChat:         typeof g.hideChat === 'function',
                hasIsChatVisible:    typeof g.isChatVisible === 'function',
                hasGetVisitorId:     typeof g.getVisitorId === 'function',
                hasIsConsentGranted: typeof g.isConsentGranted === 'function',
                // getVisitorId() returns string|null — both are primitives (not object)
                visitorIdIsStringOrNull: (() => {
                    const v = g.getVisitorId();
                    return v === null || typeof v === 'string';
                })(),
            };
        });

        expect(api.hasGuiders).toBe(true);
        expect(api.hasShowChat).toBe(true);
        expect(api.hasHideChat).toBe(true);
        expect(api.hasIsChatVisible).toBe(true);
        expect(api.hasGetVisitorId).toBe(true);
        expect(api.hasIsConsentGranted).toBe(true);
        expect(api.visitorIdIsStringOrNull).toBe(true);
    });

    // ------------------------------------------------------------------ //
    // 2. ToggleButton is rendered in the Shadow DOM
    // ------------------------------------------------------------------ //
    test('ToggleButton is rendered in Shadow DOM', async ({ page }) => {
        await gotoWP(page);

        const toggle = shadow(page, '.chat-toggle-btn');
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        await expect(toggle.locator('.btn-background')).toHaveCount(1);
    });

    // ------------------------------------------------------------------ //
    // 3. Chat opens via public API
    // ------------------------------------------------------------------ //
    test('showChat() opens the ChatWidget', async ({ page }) => {
        await gotoWP(page);

        // Ensure hidden to start.
        const widget = shadow(page, '.guiders-chat-widget-root');
        await expect(widget).toHaveCount(1);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(300);

        await expect(widget).not.toHaveClass(/hidden/);

        const visible = await page.evaluate(() =>
            (window as any).guiders.isChatVisible()
        );
        expect(visible).toBe(true);
    });

    // ------------------------------------------------------------------ //
    // 4. Chat closes via public API
    // ------------------------------------------------------------------ //
    test('hideChat() closes the ChatWidget', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(300);
        await page.evaluate(() => (window as any).guiders.hideChat());
        await page.waitForTimeout(300);

        const widget = shadow(page, '.guiders-chat-widget-root');
        await expect(widget).toHaveClass(/hidden/);

        const visible = await page.evaluate(() =>
            (window as any).guiders.isChatVisible()
        );
        expect(visible).toBe(false);
    });

    // ------------------------------------------------------------------ //
    // 5. ToggleButton click opens / closes the chat
    // ------------------------------------------------------------------ //
    test('ToggleButton click toggles chat open/closed', async ({ page }) => {
        await gotoWP(page);

        const toggle = shadow(page, '.chat-toggle-btn');
        const widget = shadow(page, '.guiders-chat-widget-root');

        // Open
        await toggle.click();
        await page.waitForTimeout(300);
        await expect(widget).not.toHaveClass(/hidden/);
        await expect(toggle).toHaveClass(/open/);

        // Close
        await toggle.click();
        await page.waitForTimeout(300);
        await expect(widget).toHaveClass(/hidden/);
        await expect(toggle).not.toHaveClass(/open/);
    });

    // ------------------------------------------------------------------ //
    // 6. ChatWidget shows header with title
    // ------------------------------------------------------------------ //
    test('ChatWidget shows chat header when opened', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(400);

        const header = shadow(page, '.chat-header');
        await expect(header).toBeVisible();

        // Close button inside header
        const closeBtn = shadow(page, '.chat-header .close-btn, .chat-header button[aria-label]');
        const closeBtnCount = await closeBtn.count();
        expect(closeBtnCount).toBeGreaterThan(0);
    });

    // ------------------------------------------------------------------ //
    // 7. QuickActions / welcome message rendered (config: enabled:true)
    // ------------------------------------------------------------------ //
    test('QuickActions welcome message and buttons render', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(500);

        // The welcome message from GUIDERS_CONFIG.quickActions.welcomeMessage
        const welcomeMsg = shadow(page, '.chat-message, .message-bubble, .guiders-message');
        const msgCount = await welcomeMsg.count();

        // At least the bot welcome message is present.
        expect(msgCount).toBeGreaterThan(0);

        // QuickAction buttons
        const qaButtons = shadow(page, '.quick-action-btn, .guiders-quick-action, [class*="quick-action"]');
        const qaCount = await qaButtons.count();
        // Config has 4 buttons: Saludar, Ver precios, Hablar con persona, Centro de ayuda
        expect(qaCount).toBeGreaterThan(0);
    });

    // ------------------------------------------------------------------ //
    // 8. Message composer is present and accepts input
    // ------------------------------------------------------------------ //
    test('Message composer is visible and accepts text input', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(400);

        const input = shadow(page, 'textarea, input[type="text"], [contenteditable="true"]');
        await expect(input.first()).toBeVisible();

        await input.first().fill('Hola, esto es una prueba');
        const value = await input.first().inputValue().catch(() =>
            page.evaluate(() => {
                const host = document.querySelector('#guiders-chat-widget');
                const sr = (host as any)?.shadowRoot;
                const ta = sr?.querySelector('textarea');
                return ta?.value ?? '';
            })
        );
        expect(value).toContain('Hola');
    });

    // ------------------------------------------------------------------ //
    // 9. Consent API works
    // ------------------------------------------------------------------ //
    test('isConsentGranted() returns true after pre-seeded consent', async ({ page }) => {
        await gotoWP(page);

        // gotoWP waits until isConsentGranted() === true before returning.
        const granted = await page.evaluate(() =>
            (window as any).guiders.isConsentGranted()
        );
        expect(granted).toBe(true);
    });

    // ------------------------------------------------------------------ //
    // 10. Visitor ID is a non-empty string (persists across navigation)
    // ------------------------------------------------------------------ //
    test('getVisitorId() returns a stable non-empty ID', async ({ page }) => {
        await gotoWP(page);

        // Wait for identify() to complete (visitorId populated after consent + init).
        const id1 = await page.waitForFunction(() => {
            const id = (window as any).guiders?.getVisitorId();
            return typeof id === 'string' && id.length > 0 ? id : null;
        }, { timeout: 15000 });
        const id1Val = await id1.jsonValue() as string;
        expect(typeof id1Val).toBe('string');
        expect(id1Val.length).toBeGreaterThan(0);

        // Navigate to another WP page and confirm same ID (cookie-persisted).
        await gotoWPUrl(page, `${WP_URL}/?page_id=2`);

        const id2 = await page.waitForFunction(() => {
            const id = (window as any).guiders?.getVisitorId();
            return typeof id === 'string' && id.length > 0 ? id : null;
        }, { timeout: 15000 });
        const id2Val = await id2.jsonValue() as string;
        expect(id2Val).toBe(id1Val);
    });

    // ------------------------------------------------------------------ //
    // 11. ChatWidget closes with the header close button
    // ------------------------------------------------------------------ //
    test('Close button inside ChatWidget header closes the chat', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(400);

        const widget = shadow(page, '.guiders-chat-widget-root');
        await expect(widget).not.toHaveClass(/hidden/);

        // Click the × close button inside the header.
        // The close button has class 'chat-close-btn' (not 'close-btn').
        const closeBtn = shadow(page, '.chat-header .chat-close-btn, .chat-header .close-btn, .chat-header button[aria-label="Cerrar chat"]');
        await closeBtn.first().click();
        await page.waitForTimeout(300);

        await expect(widget).toHaveClass(/hidden/);
    });

    // ------------------------------------------------------------------ //
    // 12. Single ChatWidget thread renders on open
    // ------------------------------------------------------------------ //
    test('Chat content (single thread) renders when opened', async ({ page }) => {
        await gotoWP(page);

        await page.evaluate(() => (window as any).guiders.showChat());
        await page.waitForTimeout(500);

        await expect(shadow(page, '.chat-widget-fixed')).toHaveCount(1);
        await expect(shadow(page, '.guiders-chat-list-view')).toHaveCount(0);
    });
});
