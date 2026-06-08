# TODO

Planned and in-progress work for FitPal, ordered by priority.

| Priority | Task | Notes |
| --- | --- | --- |
| Medium | Barcode / photo-based food logging | Let users log food by scanning a barcode or photo instead of typing, building on the existing AI food analysis. |
| Medium | Trends & progress charts | Visualize weight and nutrition trends over time to complement the existing daily views. |
| Medium | Reminders & notifications | Build on the existing notifications module to send meal/weigh-in reminders. |
| Medium | Color contrast & dark-mode visibility | Audit hardcoded color pairs (e.g. `bg-*-50`/`text-*-800` in `MotivationalBanner` and other dashboard panels) for poor contrast; add `dark:` variants and verify WCAG AA in both themes, since dark mode in `src/index.css` only restyles `.card` and `.input-field`. |
| Medium | Dark mode toggle | Add a user-facing theme control with three states: **System** (default, follows `prefers-color-scheme` and live-updates via a `matchMedia` change listener), **Light**, and **Dark** (explicit choices that override the OS). Depends on the contrast/dark-mode audit above. Switch Tailwind from the implicit `media` strategy to `darkMode: 'class'`, toggle the `dark` class on `<html>`, and persist the choice in `localStorage` (default `system`). Store this as a device/UI setting in a dedicated `ThemeContext` rather than `PreferencesContext` (which is per-account profile/goals data and requires a logged-in user), so the theme applies instantly and works on the auth page. Place the control in the `Layout` header / Profile. |
| Low | Document instance backup/restore | Document copying `fitpal.db` out of the container (`docker cp`) for self-hosters, ideally with a `scripts/backup.sh` helper. |

## Mobile-friendly

Make FitPal feel like a native app on phones. An installable PWA (manifest +
service worker with offline caching) already exists via `vite-plugin-pwa` in
`vite.config.ts`.

| Priority | Task | Notes |
| --- | --- | --- |
| High | Push notifications | Use the Web Push API on top of the existing service worker to deliver reminders even when the app is closed; ties into the reminders & notifications work above. |
| Medium | Responsive layout pass | Audit all pages for small screens (touch targets, navigation, tables) and fix any layouts that break on mobile. |
| Low | Mobile UX polish | Add pull-to-refresh, safe-area insets, and a bottom navigation bar for thumb-friendly access. |
