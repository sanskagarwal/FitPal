# TODO

Planned and in-progress work for FitPal, ordered by priority.

| Priority | Task | Notes |
| --- | --- | --- |
| Medium | Barcode / photo-based food logging | Let users log food by scanning a barcode or photo instead of typing, building on the existing AI food analysis. |
| Medium | Trends & progress charts | Visualize weight and nutrition trends over time to complement the existing daily views. |
| Medium | Reminders & notifications | Build on the existing notifications module to send meal/weigh-in reminders. |
| Medium | Dark mode toggle | Add a user-facing theme control with three states: **System** (default, follows `prefers-color-scheme` and live-updates via a `matchMedia` change listener), **Light**, and **Dark** (explicit choices that override the OS). Contrast/dark-mode coverage is already in place: every component has `dark:` variants (validated by `tests/e2e/accessibility.spec.ts` for WCAG AA in both themes), so this item is now purely the toggle UI + persistence. Switch Tailwind from the implicit `media` strategy to `darkMode: 'class'`, toggle the `dark` class on `<html>`, and persist the choice in `localStorage` (default `system`). Store this as a device/UI setting in a dedicated `ThemeContext` rather than `PreferencesContext` (which is per-account profile/goals data and requires a logged-in user), so the theme applies instantly and works on the auth page. Place the control in the `Layout` header / Profile. Note: chart colors and other non-Tailwind surfaces already read the scheme via the `usePrefersDark` hook (`src/utils/usePrefersDark.ts`); point that at the new theme source when switching strategies. |
| Low | Document instance backup/restore | Document copying `fitpal.db` out of the container (`docker cp`) for self-hosters, ideally with a `scripts/backup.sh` helper. |

## Mobile-friendly

Make FitPal feel like a native app on phones. An installable PWA (manifest +
service worker with offline caching) already exists via `vite-plugin-pwa` in
`vite.config.ts`.

| Priority | Task | Notes |
| --- | --- | --- |
| High | Push notifications | Use the Web Push API on top of the existing service worker to deliver reminders even when the app is closed; ties into the reminders & notifications work above. |
| Low | Mobile UX polish | Add pull-to-refresh and a bottom navigation bar for thumb-friendly access. |
