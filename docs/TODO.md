# TODO

Planned and in-progress work for FitPal, ordered by priority.

| Priority | Task | Notes |
| --- | --- | --- |
| Medium | Barcode-based food logging | Let users log packaged food by scanning a barcode, building on the existing AI food analysis. (Photo-based logging has shipped - see Agentic AI meal logging in FEATURES.) |
| Medium | Reminders & notifications | Build on the existing notifications module to send meal/weigh-in reminders. |
| Low | Document instance backup/restore | Document copying `fitpal.db` out of the container (`docker cp`) for self-hosters, ideally with a `scripts/backup.sh` helper. |

## Mobile-friendly

Make FitPal feel like a native app on phones. An installable PWA (manifest +
service worker with offline caching) already exists via `vite-plugin-pwa` in
`vite.config.ts`.

| Priority | Task | Notes |
| --- | --- | --- |
| High | Push notifications | Use the Web Push API on top of the existing service worker to deliver reminders even when the app is closed; ties into the reminders & notifications work above. |
