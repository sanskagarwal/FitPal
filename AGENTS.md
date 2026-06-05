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
- Avoid too many emojis and em-dashes in documentation. Keep it simple, subtle,
  and professional.
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
- Keep the privacy-first intent: no telemetry, and no sending user data to third
  parties beyond the configured AI provider.

## What agents should NOT do

- Do not add new dependencies or frameworks without being asked.
- Do not introduce React Router for page switching.
- Do not refactor or improve code beyond the requested scope.
- Do not create documentation files unless explicitly requested.
- Do not bypass lint or type checks (for example blanket `eslint-disable` or
  `as any`).
