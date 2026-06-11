# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version is in the `0.x` range, the public API and data formats may
change between minor releases.

## [Unreleased]

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

[Unreleased]: https://github.com/sanskagarwal/FitPal/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/sanskagarwal/FitPal/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/sanskagarwal/FitPal/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sanskagarwal/FitPal/releases/tag/v0.1.0
