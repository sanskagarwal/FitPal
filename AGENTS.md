# AGENTS.md

Guidance for AI agents (GitHub Copilot and other coding assistants) working in
the FitPal repository. Follow these conventions and respect the user
preferences below.

## Project overview

FitPal is a privacy-first fitness tracker for Indian meals, food intake, and
weight. It has three parts:

1. **Frontend SPA** (`src/`): React 19 + TypeScript + Vite + Tailwind CSS.
   Navigation is **state-based** (a `currentPage` string with a `switch` in
   `src/App.tsx`), **not** React Router for page switching.
2. **AI service**: `src/services/openai.ts` is a thin client that calls the
   backend `/api/ai/*` routes. Real AI calls run **server-side** in
   `server/services/aiService.ts` via the Vercel AI SDK against any
   OpenAI-compatible API, with structured outputs validated by `zod`. **The API
   key must never reach the browser.**
3. **Storage server** (`server/`): Express 5 + `better-sqlite3` persisting to
   `server/data/fitpal.db`. The frontend talks to it through the REST client in
   `src/utils/db.ts`.

## Setup and commands

- Requires **Node.js 24+**.
- Install: `npm install`, then `cd server && npm install`.
- Run everything: `npm run dev:all` (frontend on `5173`, server on `3001`).
- Frontend only: `npm run dev`. Server only: `npm run server`.
- Build (type-check + bundle): `npm run build`.
- Lint: `npm run lint` (ESLint, `--max-warnings 0`).
- Test: `npm test` (Vitest). End-to-end: `npm run test:e2e` (Playwright).

## Conventions

- **TypeScript everywhere.** Keep shared models in `src/types/index.ts` and
  avoid `any`.
- **React 19 function components** with hooks. Co-locate component files under
  `src/components/`.
- **State-based routing.** Add new pages to the `currentPage` switch in
  `src/App.tsx`. Do not introduce a router for page navigation.
- **Storage access** goes through `src/utils/db.ts` (frontend) and the
  repositories under `server/repositories/` (backend). Do not talk to SQLite
  from the frontend.
- **AI access** flows `src/services/openai.ts` to `/api/ai/*` to
  `server/services/aiService.ts`. Never call AI providers directly from the
  browser.
- The server is layered: routes to controllers to services to repositories.
  Keep that separation when adding endpoints.
- Styling uses **Tailwind CSS utility classes**. Follow existing patterns.
- **Dark mode.** Every component must ship `dark:` variants. Reuse the
  light-to-dark color mapping documented at the top of `src/index.css` and keep
  text contrast at WCAG AA (the Playwright accessibility suite checks both
  themes). The theme follows the OS color scheme; there is no in-app toggle yet.
- **Mobile/edge-to-edge.** Use the `.pt-safe`, `.pb-safe`, and `.px-safe`
  utilities (`src/index.css`) for safe-area insets on notched devices; the
  viewport meta tag already sets `viewport-fit=cover`.
- Avoid "AI-looking" special characters in code, comments, docs, and
  user-facing strings. Use plain ASCII instead. Keep writing simple, subtle, and
  professional. Specifically avoid:
  - Dashes: em-dash (U+2014), en-dash (U+2013), horizontal bar (U+2015),
    math minus (U+2212), soft hyphen (U+00AD). Use a plain hyphen `-`.
  - Quotes/punctuation: curly quotes (U+2018/2019/201C/201D), ellipsis (U+2026),
    low quotes, prime marks. Use straight quotes and `...`.
  - Invisible/spacing: non-breaking space (U+00A0), narrow/thin spaces, zero-width
    characters (U+200B/200C/200D), BOM (U+FEFF). Use a normal space.
  - Symbols/arrows: arrows (`->` etc.), legal marks (TM/(C)/(R)), and decorative
    math operators. Spell them out or use ASCII.
  - Emojis and decorative glyphs (check/cross/warning/star) in code, comments,
    and docs.
  Allowed exceptions: the branding salad emoji in the app header; the curated
  emojis already used in UI copy (the motivational dashboard banner messages,
  the Goals tips heading, and the Profile data-info heading); functional UI
  glyphs already in use (the `*` list bullet, the `x` multiplication sign in the
  meal proposal, the `.` separator); and math symbols inside AI prompt strings
  under `server/prompts/` and `server/services/aiService.ts`. When adding new
  user-facing copy, do not introduce new emojis unless asked.
- Keep changes minimal and focused, and match the surrounding code style.

## Security

- Never expose `AI_API_KEY`, `JWT_SECRET`, or any server-side secret to client
  code or commit it. Secrets live in `.env` (server-side only).
- Authentication uses a signed JWT in an httpOnly cookie. Data routes require
  auth and enforce per-user ownership.
- Validate and sanitize all inputs crossing the client/server boundary
  (`server/validation.ts`).

## What agents should do

- Read relevant files before editing and understand existing patterns first.
- Run `npm run lint` and `npm run build` after non-trivial changes.
- Prefer editing existing files over creating new ones.
- After making changes, keep documentation and tests in sync unless the user
  explicitly says not to:
  - Update affected docs (`README.md`, `docs/`, `.env.example`, and inline
    comments) so they reflect the new behavior.
  - When a planned task is finished, update or remove its entry in
    `docs/TODO.md` and any "planned" or roadmap sections.
  - Add or update tests (`npm test`, `npm run test:e2e`) to cover new or
    changed behavior, and run them to confirm they pass.
- Keep the privacy-first intent: no telemetry, and no sending user data to third
  parties beyond the configured AI provider.

## What agents should NOT do

- Do not add new dependencies or frameworks without being asked.
- Do not introduce React Router for page switching.
- Do not refactor or improve code beyond the requested scope.
- Do not create documentation files unless explicitly requested.
- Do not bypass lint or type checks (for example blanket `eslint-disable` or
  `as any`).
