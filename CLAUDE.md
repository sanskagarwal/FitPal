# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run both)
npm install
cd server && npm install

# Development
npm run dev:all        # frontend (port 5173) + server (port 3001) concurrently
npm run dev            # frontend only
npm run server         # server only

# Build
npm run build          # tsc type-check + vite build -> dist/
cd server && npm run build  # compile server TypeScript -> server/dist/

# Lint (zero warnings policy)
npm run lint

# Tests
npm test               # Vitest (unit + integration)
npm run test:watch     # Vitest watch mode
npm run test:e2e       # Playwright end-to-end

# Run a single Vitest test file
npx vitest run tests/backend/someTest.test.ts
```

Required `.env` before running (copy from `.env.example`): `JWT_SECRET` (16+ chars), `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. Only `VITE_`-prefixed vars are exposed to the frontend -- all others are server-side only.

## Architecture

FitPal is a PWA with three distinct parts that must stay separated:

**1. Frontend SPA (`src/`)** - React 19 + TypeScript + Vite + Tailwind CSS v4.
- Navigation uses **React Router** (`BrowserRouter`). Routes are defined as `<Route>` entries in `src/App.tsx`. The Express server already includes a catch-all that serves `index.html` for non-API paths, so deep links and refreshes work correctly.
- Talks to the server exclusively through `src/utils/db.ts` (the `apiCall` REST helper).
- AI features are requested via `src/services/openai.ts`, which only forwards calls to `/api/ai/*` -- no AI logic runs in the browser.
- Shared TypeScript types live in `src/types/index.ts`.

**2. Storage server (`server/`)** - Express 5 + TypeScript + `better-sqlite3`.
- Strictly layered: **routes -> controllers -> services -> repositories**. Keep this separation when adding endpoints.
- SQLite DB at `server/data/fitpal.db` (override with `DATA_DIR` env var). Schema evolved through versioned migrations in `server/db/migrations.ts`.
- Auth uses a signed JWT in an httpOnly cookie (`server/auth.ts`). All data routes require auth and enforce per-user ownership.
- Input validation at the boundary uses `zod` schemas in `server/validation.ts` and `server/domain.ts`.

**3. AI service (`server/services/aiService.ts`)** - Vercel AI SDK.
- All AI calls are server-side only. The API key never reaches the browser.
- Uses `generateText` + `Output.object` with `zod` schemas for structured outputs. Mark optional schema fields `.nullable()` for widest model compatibility.
- Prompt templates live in `server/prompts/`.
- `AI_PROVIDER` env var selects the SDK: `openai-compatible` (default), `azure`, `anthropic`, or `google`.

To add a new AI feature: add a prompt in `server/prompts/`, implement with a `zod` schema in `aiService.ts`, expose via `aiController.ts` + `aiRoutes.ts`, then add a client call in `src/services/openai.ts`.

To add a new page: create `src/components/MyPage.tsx`, add a `<Route path="/my-page" element={<MyPage />} />` in `App.tsx`, and add a nav entry in `Layout.tsx`.

To add a new storage endpoint: repository (`server/repositories/`) -> service (`server/services/`) -> controller + route, then add the client call in `src/utils/db.ts`.

## Conventions

- **TypeScript everywhere.** No `any`. No blanket `eslint-disable`.
- **Dark mode required.** Every component must include `dark:` Tailwind variants. Follow the light-to-dark color mapping at the top of `src/index.css`. For non-Tailwind surfaces (e.g. Recharts colors), use `useTheme().isDark` from `src/context/ThemeContext.tsx` -- not `prefers-color-scheme` directly.
- **Mobile safe-area insets.** Use `.pt-safe`, `.pb-safe`, `.px-safe` utilities (defined in `src/index.css`) for notched devices.
- **No AI-looking characters** in code, comments, docs, or UI strings. Use plain ASCII: plain hyphens (not em/en dashes), straight quotes (not curly), `...` (not ellipsis U+2026), normal spaces (not NBSP or zero-width). Math symbols in `server/prompts/` and `server/services/aiService.ts` are allowed exceptions, as are the specific emojis already present in the app header and a few curated UI messages.
- After non-trivial changes, run `npm run lint` and `npm run build` to confirm there are no errors.
- Keep changes minimal and focused on what was requested.
- When a task is done, update or remove its entry in `docs/TODO.md`.
