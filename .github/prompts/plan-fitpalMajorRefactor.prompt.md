# Plan: FitPal Major Refactor

A phased, incremental refactor across the React frontend and Express backend. Priorities run **P0 (critical/security) → P3 (polish)**, each phase independently shippable. Respecting AGENTS.md: state-based routing stays (no React Router for nav), keep the current manual-fetch data approach, no test suite for now, and no unrequested deps — except auth, which genuinely needs a hashing + token library.

The headline finding: there's a **serious security flaw** to fix first. Passwords are hashed client-side with unsalted SHA-256, the full user record (including the hash) is fetched to the browser via `getUserByEmail`, the "session" is just a `localStorage` user id, and **every backend route is public with no authorization** (any user can read/write any other user's meals, weights, and profile — classic IDOR).

---

## P0 — Security & Auth `CRITICAL` (do first)

1. Move password hashing to the server (bcrypt/argon2); remove `hashPassword`/`verifyPassword` from `src/utils/helpers.ts` and all client usage.
2. Add real auth endpoints — `register`, `login`, `logout`, `me` — issuing a session token (httpOnly cookie or JWT).
3. Never send password hashes or other users' data to the client; add read mappers that strip sensitive fields in `server/storage.ts`.
4. Add auth + authorization middleware so a user can only touch their own records; close the IDOR holes across `server/index.ts`.
5. Rewrite `src/context/AuthContext.tsx` to use `/api/auth/*` (no client hashing, no `getUserByEmail`).
6. Protect `/api/ai/*` behind auth.

## P1 — Backend architecture `HIGH`

7. Introduce a layered structure (`routes → controllers → services → repositories`); move route bodies out of the ~385-line `server/index.ts`.
8. Add a repository helper/base to eliminate duplicated JSON-blob CRUD in `server/storage.ts`.
9. Centralized error-handling middleware + typed errors (`ValidationError`, `NotFoundError`, `AuthError`, `AIError`) with correct status codes, replacing ~25 ad-hoc try/catch blocks.
10. Validation middleware (zod) for **all** write routes in `server/validation.ts`, not just meals.
11. Split the ~1000-line `server/ai.ts` into `services/aiService.ts` + `routes/aiRoutes.ts` + extracted `prompts/`; add fallbacks to the AI functions still missing them (e.g. `analyzeFoodWithAI`).
12. Startup env validation (zod) + a `.env.example`.

## P2 — Frontend structure `HIGH`

13. Break up the ~1200-line `src/components/FoodLogger.tsx` into `FoodSearch`, `MealChat`, `MealProposal`, `SelectedFoodsList`, `TodayMealsHistory`, `FoodQuantityInput`, plus hooks (`useFoodSearch`, `useMealChat`, `useMealEditor`) that wrap the *existing* fetch logic only.
14. Break up the ~930-line `src/components/Dashboard.tsx` into `StatCard`, `MicronutrientCard` (replaces 8 duplicated blocks), `MealSuggestionPanel`, `InsightPanel`, `MealBreakdownTable`, `ChartSection` + `useDashboardData`.
15. Decompose `src/components/Goals.tsx`, `src/components/WeightTracker.tsx`, `src/components/AuthPage.tsx`, `src/components/Profile.tsx`; move calculation helpers into utils.
16. Standardize error handling in `src/utils/db.ts`; extract the streaming helper from `src/services/openai.ts` and move shared AI types into `src/types/index.ts`.
17. Optionally split `AuthContext` into auth vs. user-preferences concerns.

## P3 — Polish & maintainability `MEDIUM`

18. Structured request/error logging (with request id) on the server.
19. Versioned schema migrations replacing the run-on-startup schema.
20. Share enums/types between `server/domain.ts` and `src/types/index.ts` to stop drift.
21. Per-user + per-endpoint rate limiting in `server/rateLimit.ts` (note Redis for multi-instance).
22. Accessibility pass on extracted components; expand `server/nutritionSeed.ts` coverage.

---

## Verification (no automated tests per project choice)

1. After each phase: `npm run lint` (root, `--max-warnings 0`) and `npm run build` pass; server `tsc` build passes.
2. Manual smoke: register → login → logout; confirm a direct API call for *another* user's id is rejected; AI flows (chat-log meal, suggestions, insights) still work; Dashboard and FoodLogger render correctly.

## Decisions

- Tests and a React Query/caching layer are explicitly excluded.
- Data-fetching mechanism stays manual; new hooks only wrap existing calls during component breakdown.
- State-based routing is preserved (`react-router-dom` is installed but won't be used for page nav).

## Open questions / further considerations

1. P0 needs new server deps for hashing + tokens. Recommendation: **bcrypt + httpOnly cookie session**. Option A: bcrypt + JWT (cookie) / Option B: argon2 + signed cookie session / Option C: bcrypt + server-side session store. - Go with recommendation
2. Existing users have unsalted SHA-256 hashes. On first login post-migration, transparently re-hash their password server-side (Option A) or require a one-time reset (Option B)? - One-Time reset
3. P2 component breakdown is large — land it **component-by-component across several PRs** (recommended) rather than all at once? - Yes, break it down into multiple PRs
