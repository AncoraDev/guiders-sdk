# Product Backlog

Low-priority items not yet assigned to any sprint. Convert to a formal story when a customer requests it or the team decides to prioritize it.

---

## BL-001 — Widget theme configuration from WP Admin

**Problem**: The widget currently follows the visitor's OS preference (`prefers-color-scheme`). Site administrators have no way to force a specific theme regardless of the visitor's system setting.

**Proposed solution**: Add a `theme` option to the SDK (`'dark' | 'light' | 'system'`, default `'system'`) and expose it as a select field in the WP Admin plugin settings panel. The PHP layer passes the value via `GUIDERS_CONFIG` at page load.

**Rough scope**:
- `SDKOptions`: add `theme` field
- `tokens.styles.ts` / Shadow DOM host: apply forced theme class when `theme !== 'system'`
- WP Admin (`class-guiders-admin.php`): new select field, saved to `wp_options`
- WP Public (`class-guiders-public.php`): inject `theme` into `GUIDERS_CONFIG`

**Estimated effort**: ~3–4h

**Trigger to promote**: first customer request, or team decision during sprint planning.

**Added**: 2026-05-05
