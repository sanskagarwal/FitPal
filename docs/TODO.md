# TODO

Planned and in-progress work for FitPal, ordered by priority.

| Priority | Task | Notes |
| --- | --- | --- |
| Medium | Barcode / photo-based food logging | Let users log food by scanning a barcode or photo instead of typing, building on the existing AI food analysis. |
| Medium | Trends & progress charts | Visualize weight and nutrition trends over time to complement the existing daily views. |
| Medium | Reminders & notifications | Build on the existing notifications module to send meal/weigh-in reminders. |
| Low | Document instance backup/restore | Document copying `fitpal.db` out of the container (`docker cp`) for self-hosters, ideally with a `scripts/backup.sh` helper. |

## Mobile-friendly

Make FitPal feel like a native app on phones. An installable PWA (manifest +
service worker with offline caching) already exists via `vite-plugin-pwa` in
`vite.config.ts`.

| Priority | Task | Notes |
| --- | --- | --- |
| High | Push notifications | Use the Web Push API on top of the existing service worker to deliver reminders even when the app is closed; ties into the reminders & notifications work above. |
| Low | Mobile UX polish | Add pull-to-refresh and a bottom navigation bar for thumb-friendly access. |
