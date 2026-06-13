# Plan: Per-meal-type recommendations & insights

## Goal

Give each meal type (breakfast, morning-snack, lunch, evening-snack, dinner) its own
personalized calorie + macro targets, revamp the dashboard meal breakdown to show
consumed-vs-target with progress, add an on-demand AI insight per logged meal (what it
lacked + how to make it up in later meals), and redesign/reorder the dashboard so the
breakdown is the hero. Targets are derived by splitting the user's personalized daily
goal across meals using the existing `MEAL_CALORIE_CAPS` proportions, so they always
sum to the daily goal.

## Decisions (confirmed)

- Targets = personalized: split the user's daily goal across meals using
  `MEAL_CALORIE_CAPS` proportions (sum of per-meal targets == daily goal).
- Show ALL 5 meal types in the breakdown (logged + not-yet-logged).
- AI per-meal insight = on-demand button per logged meal.
- Keep all 5 meal types (no snack merging).
- Dashboard scope = fuller visual redesign (not just reorder).
- PARKED (not in this plan): a "day-summary hero" dial/ring section at the top of the
  Dashboard. Re-surface as a standalone suggestion later.

## Key facts (codebase)

- `MEAL_CALORIE_CAPS` in `server/shared/enums.ts` (Breakfast 550, MorningSnack 300,
  Lunch 750, EveningSnack 300, Dinner 750; sum 2650), re-exported via `src/types/index.ts`.
- Daily macros personalized in `src/utils/goals.ts`, stored on `UserGoals`
  (`targetCalories` / `targetProtein` / `targetCarbs` / `targetFats` / `targetFiber`).
- `mealTypeStats` computed in `src/components/dashboard/useDashboardData.ts` (~L104);
  currently filters out empty meal types.
- `MealBreakdownTable.tsx` renders logged-only static rows (no targets).
- Dashboard render order: Banner, OverviewStats, Micronutrients, NutrientSuggestionPanel,
  MealSuggestionPanel, InsightPanel, MealBreakdownTable, WeightProgress, Charts.
- AI stack: `aiRoutes.ts` -> `aiController.ts` -> `aiService.ts` (+ `prompts/index.ts`),
  `validation.ts`, frontend `src/services/openai.ts`. zod structured outputs + fallbacks.
- Styling tokens: `.card` (`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6`),
  `.stat-card` (gradient), section headers `text-xl font-semibold mb-4`, outer rhythm
  `space-y-6`. Macro colors: Calories `primary-600`, Protein `red-500`, Carbs `blue-500`,
  Fats `amber-500`, Fiber purple. Framer Motion stagger (`staggerChildren: 0.06`, 0.25s).

## Phases

### Phase 1 - Per-meal target logic (data foundation)

- Add `getMealTargets(mealType, goals)` to `src/utils/goals.ts` returning
  `{ calories, protein, carbs, fats, fiber }`. Weight = `MEAL_CALORIE_CAPS[type] / sum(caps)`;
  each nutrient target = `round(weight * dailyTarget)`. Fiber uses `goals.targetFiber`
  (fallback 30).
- Add a `MealTarget` type to `src/types/index.ts`.

### Phase 2 - Revamp the breakdown UI (depends on Phase 1)

- `useDashboardData`: return all 5 meal types unfiltered (remove the `.filter` at ~L126)
  with consumed totals + an `isLogged` flag. Keep the `MealTypeStats` shape, add `isLogged`.
- `MealBreakdownTable.tsx`: accept a `goals` prop; per meal compute the target via
  `getMealTargets`. Card per meal: label + icon, status badge, calorie progress bar
  (consumed/target), macro chips (protein/carbs/fats/fiber consumed/target) color-coded
  under/on/over, a deterministic shortfall badge ("Low protein" / "Low fiber") when a
  logged meal's macro is under ~60% of its target. Unlogged meals shown muted with the
  target only.
- Add a "Get insight" button on logged meal cards (wired in Phase 3).

### Phase 3 - Per-meal AI insight (on-demand)

- Backend: add `MealInsightSchema` (zod: `assessment`, `shortfalls: [{ nutrient, note }]`,
  `makeUp: [{ mealType, suggestion }]` (min 1)) + an `INSIGHT` fallback in `aiService.ts`;
  `getMealInsight(mealType, consumed, target, remainingMealTypes[], remainingDailyBudget,
  dietPreference)` service; `mealInsightPrompt` in `prompts/index.ts`.
- Route `POST /api/ai/meal-insight` in `aiRoutes.ts`; `aiController.mealInsight`; request
  schema in `validation.ts`.
- Frontend: `getMealInsight(...)` in `src/services/openai.ts`; `MealInsight` type in
  `src/types/index.ts`.
- UI: `MealInsightPanel.tsx` (or an expandable card section) showing the assessment,
  shortfalls, and make-up suggestions per later meal. Loading + dismiss states matching
  existing panels.

### Phase 4 - Dashboard reorder + visual redesign (depends on Phases 2-3)

- Reorder: move `MealBreakdownTable` above `MealSuggestionPanel` and `InsightPanel`.
  New order: Banner, OverviewStats, Micronutrients, NutrientSuggestionPanel,
  MealBreakdownTable, MealSuggestionPanel, InsightPanel, WeightProgress, Charts.
- Visual redesign (cohesive, reuse existing tokens, keep dark mode + AA):
  - Hierarchy & grouping: keep `space-y-6` outer rhythm; visually separate primary
    sections (breakdown, overview) from secondary (AI suggestions, charts) using
    consistent section headers (`text-xl font-semibold mb-4`) and optional eyebrow/subtitle.
  - Card consistency: unify `.card` / `.stat-card` usage so the new breakdown card matches.
  - Shared macro color system: Calories `primary-600`, Protein `red-500`, Carbs `blue-500`,
    Fats `amber-500`, Fiber purple - applied consistently across breakdown bars/chips and
    existing OverviewStats/charts.
  - Progress bars: reuse the `StatCard` bar pattern (track `bg-gray-200 dark:bg-gray-700`,
    colored fill, `transition-all`).
  - Motion: match the existing Framer Motion stagger used in `OverviewStats`.
- `src/index.css`: only add a new shared utility if warranted (e.g. a meal-progress bar or
  section-eyebrow class); otherwise reuse existing.

### Phase 5 - Tests + docs (depends on all)

- Unit-test `getMealTargets` (correct proportions, sums to daily goal).
- Backend test for `/api/ai/meal-insight` (validation + fallback).
- Optional component test for `MealBreakdownTable` (targets/shortfall rendering).
- Update `docs/TODO.md` (remove the item) and `docs/FEATURES.md`.
- Run `npm run lint` (`--max-warnings 0`), `npm run build`, `npm test`.

## Relevant files

- `src/utils/goals.ts` - add `getMealTargets`, reuse `MEAL_CALORIE_CAPS` proportions + `UserGoals`.
- `src/components/dashboard/useDashboardData.ts` - stop filtering empty meal types; add targets/`isLogged`.
- `src/components/dashboard/MealBreakdownTable.tsx` - full UI revamp (bars, chips, badges, insight button).
- `src/components/Dashboard.tsx` - reorder panels, wire `getMealInsight` state.
- `server/services/aiService.ts`, `server/prompts/index.ts`, `server/controllers/aiController.ts`,
  `server/routes/aiRoutes.ts`, `server/validation.ts` - new meal-insight endpoint following the
  existing `insights` / `suggest-meal` pattern.
- `src/services/openai.ts`, `src/types/index.ts` - new client function + `MealTarget` / `MealInsight` types.
- `src/components/dashboard/OverviewStats.tsx`, `StatCard.tsx`, `MicronutrientsPanel.tsx`,
  `MotivationalBanner.tsx`, `ChartSection.tsx`, `src/index.css` - redesign consistency pass.

## Verification

1. `npm run lint`, `npm run build`, `npm test` all pass.
2. Dashboard shows all 5 meal types with calorie progress bars and macro-vs-target chips;
   unlogged meals render muted with targets; sum of per-meal targets equals the daily goal.
3. "Get insight" on a logged meal returns a structured insight (assessment + shortfalls +
   make-up suggestions for later meals); failure path falls back gracefully.
4. Breakdown appears above the AI suggestion/insight panels; cohesive spacing/headers and
   consistent macro colors across all sections; dark mode + Playwright accessibility suite
   pass in both themes.

## Out of scope

- Changing the daily-goal calculation, the food logger, or the per-meal AI suggestion
  (`suggest-meal`) logic.
- The parked "day-summary hero" section (to be suggested separately).
