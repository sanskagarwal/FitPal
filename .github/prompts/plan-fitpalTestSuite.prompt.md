# Plan: Test Suite for FitPal (unit + integration + e2e)

Stand up a full testing stack from scratch — **Vitest** for frontend (jsdom) and backend (node) unit tests, **Supertest** for backend API integration, and **Playwright** (`@playwright/test`) for e2e against a real frontend + real backend with a temp DB. AI is mocked everywhere. First pass targets the critical paths: pure utils, core services, auth/meal/weight routes, and login/log-meal/log-weight e2e flows.

## Steps

### Phase 0 — Tooling (can run in parallel)
1. *Frontend:* add devDeps (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test`); create `vitest.config.ts` (jsdom, globals) + `src/test/setup.ts`; add `test` / `test:watch` / `test:e2e` scripts to `package.json`.
2. *Backend:* add devDeps (`vitest`, `supertest`, `@types/supertest`); create `server/vitest.config.ts` (node env) + `server/test/setup.ts` (sets `JWT_SECRET`, dummy `AI_*`, temp `DATA_DIR` before imports); add `test` script to `server/package.json`.
3. *Refactor for testability:* extract a new `server/app.ts` exporting `createApp(): Express` (middleware + `apiRouter` + `errorHandler`, no `listen`/`initStorage`); make `server/index.ts` import it, then call `initStorage` + `app.listen`. Add `closeDatabase()` to `server/db/database.ts` for teardown. Build `server/test/helpers.ts` (temp-dir DB → `initStorage` → `createApp` → Supertest agent + authed-agent helper).

### Phase 1 — Unit tests (parallel, after Phase 0)
4. Frontend utils: tests for `src/utils/helpers.ts`, `src/utils/goals.ts`, `src/utils/weight.ts`, `src/components/foodLogger/foodLoggerUtils.ts` (fake timers for date labels).
5. Backend units: `server/auth.ts` crypto/JWT, `authService`/`mealService`/`weightService` (temp DB, ownership checks), zod schemas in `server/validation.ts`.

### Phase 2 — Integration (Supertest, depends on Phase 0b)
6. Route tests for auth, meals, weights (CRUD, 401 unauth, IDOR, 400 validation) and AI routes with `aiService` mocked (auth + rate-limit behavior).

### Phase 3 — E2E (Playwright, depends on Phase 0)
7. Create `playwright.config.ts` with a `webServer` (backend on temp DB + built frontend preview) and `/api/ai/*` route mocks; write `e2e/` specs for register/login/logout, log-meal, log-weight, plus an authed-page fixture.

### Phase 4 — Verify
8. `npm test`, `cd server && npm test`, `npm run test:e2e` all green; `npm run lint` + `npm run build` still pass.

## Relevant files
- `server/index.ts` — split out `createApp()` so Supertest can drive the app without binding a port.
- `server/db/database.ts` — `initDatabase`/`getDb` singleton; add `closeDatabase()` for per-test reset.
- `server/storage.ts` — `initStorage(dataDir)` reused in the test harness.
- `server/services/authService.ts`, `server/services/mealService.ts`, `server/services/weightService.ts` — primary unit targets.
- `server/services/aiService.ts` — `vi.mock` target so no real provider/keys are hit.
- `server/validation.ts` — zod schemas to validate directly.
- `src/utils/helpers.ts`, `src/utils/goals.ts`, `src/utils/weight.ts`, `src/components/foodLogger/foodLoggerUtils.ts` — pure-function unit targets.
- `package.json` / `server/package.json` — devDeps + scripts.

## Verification
1. `npm test` — frontend Vitest suite passes.
2. `cd server && npm test` — backend unit + integration suites pass.
3. `npm run test:e2e` — Playwright flows (auth, log-meal, log-weight) pass against built app + temp-DB server.
4. `npm run lint` (max-warnings 0) and `npm run build` remain green after the `index.ts`/`app.ts` refactor.

## Decisions
- Included: critical-path coverage (utils, core services, auth/meal/weight routes, 3 e2e flows). Excluded for now: exhaustive component/coverage of every controller, notification/streak/recipe routes, and a CI workflow file.
- AI is mocked in all tiers; no real keys needed.
- Backend integration uses a refactored `createApp()` + Supertest with isolated temp-dir SQLite.

## Further considerations
1. Backend test DB: temp-dir file DB per test file (no db-layer change) vs adding `:memory:` support. Recommend **temp-dir file** for simplicity.
2. E2E web server: prod-like **build + `vite preview`** (deterministic, recommended) vs `dev:all` (faster startup).
3. A CI workflow (GitHub Actions) to run all three suites — currently out of scope.
