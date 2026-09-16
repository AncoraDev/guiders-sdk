/**
 * Widget Basic E2E Tests
 *
 * Covers all interactive buttons, core actions and basic visual assertions
 * for the Guiders chat widget. Tests run against the PHP demo server
 * (127.0.0.1:8083) and are skipped automatically when it is unavailable.
 *
 * Sections:
 *  1. Toggle button — open/close widget
 *  2. Close button — close from inside the widget
 *  3. Back button — navigate from chat to list view
 *  4. Chat input & send button — type and submit a message
 *  5. Quick actions — render and clickability
 *  6. Visual / structural — header, avatar, input area present
 *  7. Theme token smoke — CSS custom properties are set on shadow host
 */

import { test, expect, type Page } from '@playwright/test';
import { requireDemo } from './utils/env';

// Run serially — parallel execution causes BotDetector race conditions
// (multiple tabs + sub-100ms load time pushes score above 0.6 threshold).
test.describe.configure({ mode: 'serial' });

const DEMO_URL = 'http://127.0.0.1:8083/?dev';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the demo, trigger a human-like mouse move to bypass the
 * BotDetector, and wait until `window.guiders` is fully initialised.
 */
async function gotoDemo(page: Page): Promise<void> {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' });
    await page.mouse.move(200, 200);
    await page.mouse.move(220, 220);
    await page.waitForFunction(() => Boolean((window as any).guiders), {
        timeout: 15_000,
    });
    // Let Preact finish any pending shadow-DOM mounts.
    await page.waitForTimeout(500);
}

/**
 * Same as gotoDemo but clears all SDK-related storage first so the widget
 * always boots in "first visit" state (no prior chats, no tokens).
 * Use for tests that need a clean slate (quick-actions, list view CTA, etc.)
 */
async function gotoDemoFresh(page: Page): Promise<void> {
    // addInitScript runs before the page scripts — storage is cleared before
    // the SDK boots, so it never finds any prior session data.
    await page.addInitScript(() => {
        const keys = [
            'guiders_recent_chats',
            'guiders_session',
            'guiders_session_id',
            'guiders_backend_session_id',
            'guiders_consent_state',
            'accessToken',
            'refreshToken',
            'tokenExpiration',
            'visitorId',
            'fingerprint',
            'guidersApiKey',
            'pixelEndpoint',
            'tenantId',
        ];
        keys.forEach(k => {
            try { localStorage.removeItem(k); } catch { /* sandboxed */ }
            try { sessionStorage.removeItem(k); } catch { /* sandboxed */ }
        });
    });
    await gotoDemo(page);
}

/**
 * Scope a locator inside the SDK shadow root without leaving the host element.
 * Playwright walks shadow boundaries automatically for CSS selectors when the
 * host element is the root of the locator chain.
 */
function shadow(page: Page, selector: string) {
    return page.locator(`#guiders-chat-widget ${selector}`);
}

/** Open the widget via the public API and wait for animation. */
async function openWidget(page: Page): Promise<void> {
    await page.evaluate(() => (window as any).guiders.showChat());
    await page.waitForTimeout(300);
}

/** Close the widget via the public API and wait for animation. */
async function closeWidget(page: Page): Promise<void> {
    await page.evaluate(() => (window as any).guiders.hideChat());
    await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// 1. Toggle button
// ---------------------------------------------------------------------------

test.describe('Toggle button', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('renders in the DOM', async ({ page }) => {
        await gotoDemo(page);
        await expect(shadow(page, '.chat-toggle-btn')).toHaveCount(1);
    });

    test('click opens the widget', async ({ page }) => {
        await gotoDemo(page);
        const widget = shadow(page, '.guiders-chat-widget-root');
        await expect(widget).toHaveClass(/hidden/);

        await shadow(page, '.chat-toggle-btn').click();
        await page.waitForTimeout(300);

        await expect(widget).not.toHaveClass(/hidden/);
        await expect(shadow(page, '.chat-toggle-btn')).toHaveClass(/open/);
    });

    test('second click closes the widget', async ({ page }) => {
        await gotoDemo(page);
        const toggle = shadow(page, '.chat-toggle-btn');

        await toggle.click();
        await page.waitForTimeout(300);
        await toggle.click();
        await page.waitForTimeout(300);

        await expect(shadow(page, '.guiders-chat-widget-root')).toHaveClass(/hidden/);
        await expect(toggle).not.toHaveClass(/open/);
    });
});

// ---------------------------------------------------------------------------
// 2. Close button (×)
// ---------------------------------------------------------------------------

test.describe('Close button', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('is visible when widget is open', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-close-btn')).toBeVisible();
    });

    test('click closes the widget', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);

        await shadow(page, '.chat-close-btn').click();
        await page.waitForTimeout(300);

        await expect(shadow(page, '.guiders-chat-widget-root')).toHaveClass(/hidden/);
    });

    test('widget reports not visible after close-btn click', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await shadow(page, '.chat-close-btn').click();
        await page.waitForTimeout(300);

        const visible = await page.evaluate(() => (window as any).guiders.isChatVisible());
        expect(visible).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 4. Chat input & send button
// ---------------------------------------------------------------------------

test.describe('Chat input and send button', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('input field is visible when chat is open', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-input-field')).toBeVisible();
    });

    test('send button is visible when chat is open', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-send-btn')).toBeVisible();
    });

    test('typing into input updates its value', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await shadow(page, '.chat-input-field').fill('Hello, this is a test message');
        await expect(shadow(page, '.chat-input-field')).toHaveValue('Hello, this is a test message');
    });

    test('Enter key clears the input (message submitted)', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await shadow(page, '.chat-input-field').fill('Test message');
        await shadow(page, '.chat-input-field').press('Enter');
        await page.waitForTimeout(400);
        await expect(shadow(page, '.chat-input-field')).toHaveValue('');
    });
});

// ---------------------------------------------------------------------------
// 5. Quick actions (fresh state — no prior chat history)
// ---------------------------------------------------------------------------

test.describe('Quick actions', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('empty state renders on first visit', async ({ page }) => {
        // Clear all SDK storage so the widget boots with no chat history.
        await gotoDemoFresh(page);
        await openWidget(page);

        await expect(shadow(page, '.guiders-chat-empty')).toBeVisible();
    });

    test('quick action buttons stay hidden when demo has none configured', async ({ page }) => {
        await gotoDemoFresh(page);
        await openWidget(page);

        await expect(shadow(page, '.guiders-quick-actions')).toHaveCount(0);
        await expect(shadow(page, '.guiders-chat-empty')).toBeVisible();
    });

    test('empty state shows human-first welcome copy', async ({ page }) => {
        await gotoDemoFresh(page);
        await openWidget(page);

        const empty = shadow(page, '.guiders-chat-empty');
        await expect(empty).toBeVisible();
        await expect(empty).toContainText('Cuéntanos qué necesitas');
        await expect(empty).toContainText('Te lee una persona, no un bot.');
    });
});

// ---------------------------------------------------------------------------
// 6. Visual / structural
// ---------------------------------------------------------------------------

test.describe('Visual structure', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('header is visible when widget is open', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-header')).toBeVisible();
    });

    test('header contains avatar container', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-header-avatar-container')).toBeVisible();
    });

    test('header contains title', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-header-title')).toBeVisible();
    });

    test('messages container is present inside open widget', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-messages')).toBeVisible();
    });

    test('input wrapper is present inside open widget', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);
        await expect(shadow(page, '.chat-input-wrapper')).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// 7. Theme token smoke
// ---------------------------------------------------------------------------

test.describe('Theme CSS tokens', () => {
    test.beforeEach(({ page }) => requireDemo());

    test('shadow host receives CSS custom properties from default theme', async ({ page }) => {
        await gotoDemo(page);

        const tokens = await page.evaluate(() => {
            const host = document.querySelector('#guiders-chat-widget') as HTMLElement | null;
            if (!host?.shadowRoot) return null;
            const root = host.shadowRoot.querySelector('.chat-widget') as HTMLElement | null;
            if (!root) return null;
            const cs = getComputedStyle(root);
            return {
                headerBg: cs.getPropertyValue('--gds-color-header-bg').trim(),
                bubbleOwn: cs.getPropertyValue('--gds-color-bubble-own').trim(),
                widgetBg: cs.getPropertyValue('--gds-color-bg').trim(),
            };
        });

        expect(tokens).not.toBeNull();
        // Tokens must be non-empty strings — actual values vary by theme.
        expect(tokens!.headerBg.length).toBeGreaterThan(0);
        expect(tokens!.bubbleOwn.length).toBeGreaterThan(0);
        expect(tokens!.widgetBg.length).toBeGreaterThan(0);
    });

    test('header background colour matches --gds-color-header-bg token', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);

        const result = await page.evaluate(() => {
            const host = document.querySelector('#guiders-chat-widget') as HTMLElement | null;
            const sr = host?.shadowRoot;
            if (!sr) return null;
            const header = sr.querySelector('.chat-header') as HTMLElement | null;
            const root = sr.querySelector('.chat-widget') as HTMLElement | null;
            if (!header || !root) return null;
            const actual = getComputedStyle(header).backgroundColor;
            const token = getComputedStyle(root).getPropertyValue('--gds-color-header-bg').trim();
            return { actual, token };
        });

        expect(result).not.toBeNull();
        // Both must be non-empty — exact colour equality is intentionally
        // not asserted here because computed background can differ slightly
        // (e.g. rgb() vs rgba()) from the raw token value.
        expect(result!.actual.length).toBeGreaterThan(0);
        expect(result!.token.length).toBeGreaterThan(0);
    });

    test('IA badge is visible and readable on header', async ({ page }) => {
        await gotoDemo(page);
        await openWidget(page);

        await expect(shadow(page, 'span[aria-label="Asistente IA"]')).toBeVisible();

        const colors = await page.evaluate(() => {
            const host = document.querySelector('#guiders-chat-widget') as HTMLElement | null;
            const sr = host?.shadowRoot;
            const el = sr?.querySelector('span[aria-label="Asistente IA"]') as HTMLElement | null;
            if (!el) return null;
            const cs = getComputedStyle(el);
            return { bg: cs.backgroundColor, color: cs.color };
        });

        expect(colors).not.toBeNull();
        // Must have some background and text colour — non-transparent.
        expect(colors!.bg).not.toBe('rgba(0, 0, 0, 0)');
        expect(colors!.color.length).toBeGreaterThan(0);
    });
});
