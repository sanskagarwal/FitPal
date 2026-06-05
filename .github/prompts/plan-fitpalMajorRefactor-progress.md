# P0 — Security & Auth (FitPal Major Refactor)

Executing **P0 only** from `.github/prompts/plan-fitpalMajorRefactor.prompt.md`. This is the
critical security phase and is independently shippable. P1–P3 follow as later PRs.

## Decisions (from plan's open questions)
- **Hashing + tokens:** bcrypt (`bcryptjs`) + JWT stored in an **httpOnly cookie**.
- **Legacy SHA-256 users:** one-time reset. Legacy hashes cannot log in; a
  `/api/auth/reset-password` endpoint lets a user set a new (bcrypt) password.
- Preserve state-based routing, manual-fetch data approach, no new unrelated deps.

## Approach to IDOR (least-invasive, keeps current URL shapes)
Keep existing route shapes (`/api/meals/:userId`, etc.). Add `requireAuth` middleware that
reads the JWT cookie → `req.userId`, plus ownership checks that reject when the path param
or body `userId` ≠ `req.userId`. This avoids rewriting every frontend call URL.

## Server changes
1. **Deps:** add `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ `@types/*`) to `server/package.json`; `npm install`.
2. **`server/auth.ts` (new):** `hashPassword`/`verifyPassword` (bcrypt), `signToken`/`verifyToken` (JWT),
   `requireAuth` middleware, `requireOwnUserId(param)` and `requireOwnBodyUserId` ownership guards,
   cookie name/options helpers.
3. **`server/env.ts`:** require `JWT_SECRET` (fail fast if missing). Add `JWT_SECRET` to `.env.example` if present.
4. **`server/storage.ts`:** add `getUserRecordByEmail`/`getUserRecordById` (full record, server-only),
   `toPublicUser` mapper (strips `password`), and `emailExists`. `saveUser` already upserts.
5. **`server/index.ts`:**
   - `app.use(cookieParser())`.
   - New `/api/auth` router: `register`, `login`, `logout`, `me`, `reset-password`. Sets/clears httpOnly cookie.
     `register`/`login`/`me` return public user (no hash).
   - Apply `requireAuth` to all data routes (users, meals, weights, notifications, streaks) and to `/api/ai`.
   - Add ownership guards so a user can only touch their own records (closes IDOR).
   - Remove/lock down `GET /api/users/email/:email` (no longer needed by client; remove it).
   - Keep raw `POST /api/users` etc. but guard with ownership (id must equal session user).

## Frontend changes
6. **`src/utils/helpers.ts`:** remove `hashPassword` + `verifyPassword` (and unused crypto).
7. **`src/utils/db.ts`:** add `credentials: 'include'` to `apiCall`; add `authRegister`, `authLogin`,
   `authLogout`, `authMe`, `authResetPassword`; remove `getUserByEmail` (and `getAllUsers` if unused).
8. **`src/services/openai.ts`:** add `credentials: 'include'` to both fetch sites (AI now requires auth).
9. **`src/context/AuthContext.tsx`:** rewrite `login`/`register`/`logout` to call `/api/auth/*`
   (no client hashing, no `getUserByEmail`); load session on mount via `authMe()` instead of
   localStorage user-id. `updateProfile`/`updateGoals` still PUT `/api/users/:id`.
10. **`src/components/AuthPage.tsx`:** use the user returned from `register()` for the initial-weight
    log (drop the `setTimeout`/localStorage hack).
11. **`src/types/index.ts`:** make `User.password` optional (client never holds it).

## Verification
- `npm run lint` (root, `--max-warnings 0`) passes.
- `npm run build` passes (frontend `tsc` + vite).
- Server build: `cd server && npm run build` (tsc) passes.
- Manual smoke (if runnable): register → me → logout → login; a cross-user API call (other userId)
  returns 403; AI chat still works while authed and 401s when logged out.

## Out of scope (later PRs)
P1 backend layering, P2 frontend decomposition, P3 polish — tracked in the prompt file.

---

## Status (end of session)
- **P0 (Security & Auth):** DONE — commit `fb965ee`.
- **P1 (Backend architecture):** DONE — commit `9dc1c6c`.
- **Merged into local `main`:** merge commit `3c8db1d` (resolved conflicts in
  aiService.ts, AuthPage.tsx, db.ts; kept refactor + main's lint fixes).
  Validated: server `tsc` ✅, frontend build ✅, `npm run lint` ✅ (exit 0).
- **P2 (Frontend structure):** DONE — landed component-by-component:
  - 13. FoodLogger → `src/components/foodLogger/*` (FoodSearch, MealChat,
    MealProposal, SelectedFoodsList, TodayMealsHistory, FoodQuantityInput,
    ConfidenceBadge + hooks useTodayMeals/useFoodSearch/useMealEditor/useMealChat
    + foodLoggerUtils) — commit `853e872`.
  - 14. Dashboard → `src/components/dashboard/*` (StatCard, OverviewStats,
    MicronutrientCard, MicronutrientsPanel, MealSuggestionPanel, InsightPanel,
    MealBreakdownTable, NutrientSuggestionPanel, WeightProgress, ChartSection,
    MotivationalBanner + useDashboardData) — commit `9a6804c`.
  - 15. Goals/WeightTracker/AuthPage/Profile decomposed into `goals/`, `weight/`,
    `auth/`, `profile/` subfolders; calc helpers extracted to `src/utils/goals.ts`
    and `src/utils/weight.ts` — commit `0d02004`.
  - 16. `db.ts` `ApiError` + parsed server messages; NDJSON stream helper
    `src/services/ndjsonStream.ts`; AI types moved to `src/types/index.ts`
    — commit `ba98064`.
  - 17. Split AuthContext → `PreferencesContext` (updateProfile/updateGoals)
    — commit `2bf6223`.
  - Also fixed a register bug: real server errors now surface (no more blanket
    "Email already exists") + 8-char password validated client-side — commit `1a7c3c2`.
  - Each step validated with `npm run lint` ✅ and `npm run build` ✅.
- Local `main` not yet pushed to origin (push needs user approval).

## Remaining — P3 (Polish & maintainability), not yet started
18. Structured request/error logging (request id) on the server.
19. Versioned schema migrations replacing run-on-startup schema.
20. Share enums/types between `server/domain.ts` and `src/types/index.ts`.
21. Per-user + per-endpoint rate limiting in `server/rateLimit.ts`.
22. Accessibility pass on extracted components; expand `server/nutritionSeed.ts`.
