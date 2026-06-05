# AGENTS.md

Guidance for AI agents (GitHub Copilot, and other coding assistants) working in
the FitPal repository. Follow these conventions and respect the user's
preferences below.

## Project overview

FitPal is a privacy-first fitness tracker for Indian meals, food intake, and
weight. It has three parts:

1. **Frontend SPA** (`src/`) — React 19 + TypeScript + Vite + Tailwind CSS.
   Navigation is **state-based** (a `currentPage` string with a `switch` in
   `src/App.tsx`), **not** React Router for page switching.
2. **AI service** — `src/services/openai.ts` is a thin client that calls the
   backend `/api/ai/*` routes. Real AI calls run **server-side** in
   `server/ai.ts` via the Vercel AI SDK against any OpenAI-compatible API, with
   structured outputs validated by `zod`. **The API key must never reach the
   browser.**
3. **Storage server** (`server/`) — Express 5 + `better-sqlite3` persisting to
   `server/data/fitpal.db`. The frontend talks to it through the REST client in
   `src/utils/db.ts`.

## Setup & commands

- Requires **Node.js 24+**.
- Install: `npm install`, then `cd server && npm install`.
- Run everything: `npm run dev:all` (frontend on `5173`, server on `3001`).
- Frontend only: `npm run dev`. Server only: `npm run server`.
- Build (type-check + bundle): `npm run build`.
- Lint: `npm run lint` (ESLint, `--max-warnings 0`).

## Conventions

- **TypeScript everywhere.** Keep types in `src/types/index.ts` for shared
  models; avoid `any`.
- **React 19 function components** with hooks. Co-locate component files under
  `src/components/`.
- **State-based routing** — add new pages to the `currentPage` switch in
  `src/App.tsx`, do not introduce a router for page navigation.
- **Storage access** goes through `src/utils/db.ts` (frontend) and
  `server/storage.ts` (backend). Don't talk to SQLite from the frontend.
- **AI access** goes through `src/services/openai.ts` → `/api/ai/*` →
  `server/ai.ts`. Never call AI providers directly from the browser.
- Styling uses **Tailwind CSS utility classes**; follow existing patterns.
- Avoid using too-many emojis and em-dashes in documentations. Keep it simple, subtle, and professional.
- Keep changes minimal and focused; match the surrounding code style.

## Security

- Never expose `AI_API_KEY` or any server-side secret to client code or commit
  it. Secrets live in `.env` (server-side only).
- Validate and sanitize all inputs crossing the client/server boundary
  (`server/validation.ts`).
- Be mindful of the rate limiting in `server/rateLimit.ts` when touching routes.

## What agents should do

- Read relevant files before editing; understand existing patterns first.
- Run `npm run lint` and `npm run build` after non-trivial changes.
- Prefer editing existing files over creating new ones.
- Keep the user's privacy-first intent: no telemetry, no sending user data to
  third parties beyond the configured AI provider.

## What agents should NOT do

- Don't add new dependencies or frameworks without being asked.
- Don't introduce React Router for page switching.
- Don't refactor or "improve" code beyond the requested scope.
- Don't create documentation files unless explicitly requested.
- Don't bypass lint/type checks (e.g. blanket `eslint-disable`, `as any`).
