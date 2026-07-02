# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is in the `0.x` range, the public API and data formats may
change between minor releases.

## [Unreleased]

## [0.8.0] - 2026-07-02

### Added

- Water intake tracking on the Dashboard. Daily goal (default 8 cups) is set from the Goals page.
- Notification settings page: grant or revoke push-notification permission and set per-meal reminder times.
- Web push meal reminders: the service worker delivers reminders at your chosen times even when the app is in the background or closed.
- Nutrition label scan: point the camera (or upload a photo) at a packaged food's nutrition facts panel and the values are filled in automatically.
- Backup exports a ZIP with all user data including meal photos, water entries, nutrition cache, and streak; restore accepts the same ZIP in Merge or Replace mode.
- Pre-restore modal shows backup date and record counts and requires explicit mode selection before any data is changed.
- Data & Backup card shows time since last backup with an amber badge when overdue; dashboard shows a dismissible nudge when no backup exists or it is older than 30 days.
- `scripts/backup.sh` and `scripts/restore.sh` for instance-level database snapshots via `docker cp`.

### Changed

- Navigation migrated from local state to React Router, enabling proper deep links, back/forward navigation, and page refreshes.

## [0.7.0] - 2026-06-30

### Security

- Server now ships HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) via helmet.
- Server refuses to start if `JWT_SECRET` is still set to the example placeholder value.

### Fixed

- 100x calorie inflation when logging foods by weight (grams/ml) via Meal Chat.
- Micronutrients (vitamins, calcium, iron, etc.) were always zero for common Indian
  foods logged via Meal Chat.
- AI-learned nutrition values were shared across all users instead of being per-user.
- Editing a food's calories in the proposal panel or meal editor now scales macros
  proportionally.
- Meal suggestions now give a sensible result when the daily calorie goal is already met.

## [0.6.0] - 2026-06-30

### Added

- Dashboard shows a "Log your first meal" button when no meals are logged for the day.
- Food logger shows a "Quick Re-log" strip with recent meals from previous days for one-tap re-logging.
- Swipe left/right on the dashboard and food logger to navigate between days.

### Fixed

- Chat conversation is now restored after switching tabs or backgrounding the app mid-session.

## [0.5.3] - 2026-06-17

### Fixed

- Server build error that prevented the 0.5.2 release image from building.

## [0.5.2] - 2026-06-17

### Changed

- Quick Log with AI no longer interrupts the chat to ask which meal it is.
- Meal-type guesses now follow your local time zone instead of the server's.

### Fixed

- Quick Log with AI now infers the meal type into an editable, "inferred"-tagged
  dropdown.
- Corrected the time-of-day windows for the default meal type (mid-morning is now
  Breakfast), including the dashboard's AI suggestions.

## [0.5.1] - 2026-06-14

### Added

- Self-hosting security guide ([docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)).

### Fixed

- Dashboard color contrast now meets WCAG AA in light and dark themes.

### Security

- AI endpoints validate request bodies and guard user text against prompt injection.

## [0.5.0] - 2026-06-13

### Added

- Per-meal targets: the dashboard meal breakdown now shows each meal type
  against its own calorie and macro targets, split from your daily goal. Logged
  meals get a calorie progress bar and color-coded protein/carbs/fats/fiber
  versus their targets, and meals you have not logged yet appear as slim
  target-only rows.
- Per-meal AI insight: on any logged meal, get an on-demand AI review of how it
  did against its target, what it lacked, how to improve that meal, and how to
  make up the gap in your later meals.
- Trends range selector: the dashboard and weight pages can now switch their
  trend charts between the last 7, 30, or 90 days, or all time.

### Changed

- Redesigned dashboard: it now opens with a day-at-a-glance hero - a calorie
  ring showing how much you have eaten versus your target, the calories left for
  the day (or how far over), a short status line, and compact protein/carbs/fats
  pills - replacing the old overview cards and motivational banner.
- The micronutrients panel now leads with a focused set of key micros as compact
  rows, with "View all" to expand the rest.

## [0.4.0] - 2026-06-13

### Added

- Log a meal from a photo: in Quick Log with AI, snap or upload a picture of
  your plate and the assistant identifies the foods and portions for you. You
  review and edit the proposal as usual before saving, and the photo is kept
  with the meal and shown on the Food Logger. Self-hosters can point an optional
  `AI_VISION_MODEL` at a dedicated vision model; it falls back to `AI_MODEL`.

### Changed

- The meal-type picker now lives next to the foods you are logging (inside the
  Selected Foods card), and editing a meal scrolls straight to the editor.

### Fixed

- Saving an AI-logged meal could fail for common foods that were missing some
  micronutrient values; those are now filled in automatically.
- Removing every food while editing a meal no longer leaves it stuck in edit
  mode with no way to cancel.
- Tidied the AI meal proposal summary (odd capitalization and a stray time
  value).

## [0.3.0] - 2026-06-10

### Added

- Theme toggle: pick System, Light, or Dark from the header or Profile page.
  Your choice is remembered across sessions; System keeps following your
  operating system color scheme.

### Changed

- Number fields now bring up numeric and decimal keypads on mobile devices,
  making it quicker to log weight, quantities, and goal targets.

## [0.2.0] - 2026-06-08

### Added

- Dark mode: every screen now follows your operating system color scheme, with
  contrast tuned for WCAG AA in both light and dark themes.
- Self-service account deletion: permanently remove your account and all of your
  data from the Profile page, gated behind your password and a typed
  confirmation.
- Data restore: import a previously exported backup to restore your meals,
  weight, goals, and profile.
- Edge-to-edge mobile support with `viewport-fit=cover` and safe-area insets so
  content clears notches and home indicators.

### Changed

- Responsive layout pass across all pages for more comfortable spacing and
  touch targets on small screens.

### Fixed

- Numerous accessibility issues, including low-contrast text in dark mode.

### Removed

- Unused frontend dependencies, trimming the install footprint.

## [0.1.0] - 2026-06-06

### Added

- Initial release of FitPal: a privacy-first fitness tracker for Indian meals,
  food intake, and weight.
- React 19 + TypeScript + Vite frontend with state-based navigation.
- Express 5 + better-sqlite3 storage server with JWT cookie authentication.
- Server-side AI service (Vercel AI SDK) for meal and nutrition assistance.

[Unreleased]: https://github.com/sanskagarwal/FitPal/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/sanskagarwal/FitPal/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/sanskagarwal/FitPal/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/sanskagarwal/FitPal/compare/v0.5.3...v0.6.0
[0.5.3]: https://github.com/sanskagarwal/FitPal/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/sanskagarwal/FitPal/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/sanskagarwal/FitPal/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/sanskagarwal/FitPal/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/sanskagarwal/FitPal/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/sanskagarwal/FitPal/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/sanskagarwal/FitPal/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sanskagarwal/FitPal/releases/tag/v0.1.0
