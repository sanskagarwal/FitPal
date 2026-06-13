# Plan: Dashboard day-summary hero + simplification

## Goal

Add a compact "day at a glance" hero to the top of the Dashboard - a calorie
ring/dial with the day's key macro mini-stats and remaining-for-the-day - and
use it to simplify the dashboard by removing redundant panels. The hero becomes
the single headline summary for the day, and several dense/overlapping sections
are trimmed so the dashboard reads in one glance before drilling into the
per-meal breakdown.

## Decisions (confirmed)

- Hero **replaces** `OverviewStats` (the four macro cards) and **absorbs**
  `MotivationalBanner` (the contextual status message).
- Ring/dial built with **recharts `RadialBarChart`** (reuses the existing
  recharts dependency; no new deps).
- Macro mini-stats shown as **compact color-coded pills** ("Protein 80/150g",
  green/amber by status), not bars.
- Simplification cuts:
  - **Remove** the Macro Distribution pie chart (fully covered by the hero +
    meal breakdown).
  - **Collapse** Micronutrients to the top few with a "View all" toggle.
  - **Simplify** the Weekly chart to a calories-only line with a target line.

## Key facts (codebase)

- `Dashboard.tsx` is grouped into three sections: "Today's progress"
  (MotivationalBanner, OverviewStats, MicronutrientsPanel, NutrientSuggestionPanel,
  MealBreakdownTable), "AI coach" (MealSuggestionPanel, InsightPanel), and
  "Trends & progress" (WeightProgress, MacroDistributionChart,
  WeeklyNutritionTrendsChart).
- No circular/radial progress component exists yet; only linear bars
  (`StatCard`, `MealRow`, `MacroChip`). recharts is already used for `PieChart`
  and `LineChart` in `ChartSection.tsx`.
- `useDashboardData` returns `todayStats` (`{ totalCalories, totalProtein,
  totalCarbs, totalFats, mealsLogged }`), `weeklyData` (DailyStats[]),
  `recentWeight`, `mealTypeStats`, `micronutrients`.
- Remaining-for-the-day is computed ad hoc as `goals.targetX - todayStats.totalX`
  (Dashboard.tsx meal-suggestion handler) and as a calorie percentage in
  `MotivationalBanner`; it is never surfaced as a headline number.
- `MotivationalBanner` derives a 4-tier status (under / on track / over / way
  over) from the calorie percentage, with color + icon + message.
- `OverviewStats` / `StatCard` also expose a per-macro "Suggest Foods" button
  that calls `handleNutrientSuggestion`. The same nutrient-suggestion flow is
  also reachable from `MicronutrientCard`.
- Styling tokens: `.card`, section eyebrow `SectionLabel`, macro colors
  (Calories primary, Protein red-500, Carbs blue-500, Fats amber-500, Fiber
  purple). Charts are theme-aware via `useChartTheme()` / `useTheme().isDark`.
- Dark mode + WCAG AA required on all new UI (Playwright a11y suite checks both
  themes).

## Phases

### Phase 1 - DaySummaryHero component (new)

- Create `src/components/dashboard/DaySummaryHero.tsx`.
- Calorie ring: recharts `RadialBarChart` (single value = calories consumed,
  `PolarAngleAxis` domain `[0, targetCalories]`, 90 to -270 sweep, rounded cap,
  muted track). Centered overlay (absolutely-positioned div) shows
  `consumed / target kcal` and a secondary line: `N kcal left` (or `N over`
  when above target). Ring color shifts to amber/red when over target, primary
  otherwise. Theme-aware colors.
- Status message: extract `MotivationalBanner`'s status logic into a small
  shared helper (e.g. `src/utils/dayStatus.ts` or co-located) returning
  `{ message, tone }`; render it as a single line under the ring so the hero
  absorbs the banner.
- Macro pills: Protein / Carbs / Fats as compact pills
  (`consumed/target` g), color-coded green (on track) / amber (over) / neutral
  (under), reusing the macro color accents.
- Props: `todayStats`, `goals`. Pure presentational; no data fetching.
- Use the existing `.card` shell and Framer Motion entrance consistent with the
  rest of the dashboard.

### Phase 2 - Wire hero in, remove OverviewStats + MotivationalBanner

- In `Dashboard.tsx`, replace `MotivationalBanner` + `OverviewStats` at the top
  of the "Today's progress" section with `<DaySummaryHero todayStats goals />`.
- Drop the per-macro "Suggest Foods" trigger that lived on the macro cards
  (macro-level gaps are covered by `MealSuggestionPanel` and per-meal insights);
  keep the nutrient-suggestion flow for micronutrients (still wired through
  `MicronutrientsPanel` -> `NutrientSuggestionPanel`).
- Delete the now-unused `OverviewStats.tsx`, `StatCard.tsx`, and
  `MotivationalBanner.tsx` (after moving the status logic to the shared helper).
  Remove their imports.

### Phase 3 - Simplify Micronutrients (top few + "View all")

- `MicronutrientsPanel.tsx`: show a curated top set by default (e.g. Fiber,
  Iron, Calcium, Vitamin D) and a "View all" toggle that expands the remaining
  tiles. Preserve the existing tiles, colors, and the per-tile "Suggest" action;
  only gate visibility. Toggle is keyboard-accessible with dark-mode variants.

### Phase 4 - Simplify charts

- Remove `MacroDistributionChart` from the Dashboard render and delete the
  unused export from `ChartSection.tsx` (and its imports).
- `WeeklyNutritionTrendsChart`: reduce to a single Calories line plus a
  `ReferenceLine` at `goals.targetCalories` (pass `goals`/target in). Drop the
  protein/carbs/fats lines and the now-unused legend entries. Keep it
  theme-aware.

### Phase 5 - Tests + docs

- Add a component test for `DaySummaryHero` (renders consumed/target, the
  "left"/"over" line flips correctly, macro pills show values).
- Add/adjust a unit test for the extracted day-status helper (tier boundaries).
- Update any tests that referenced removed components
  (`OverviewStats`/`MotivationalBanner`/`MacroDistributionChart`) if present.
- Update `docs/FEATURES.md` (Dashboard: day-summary hero, simplified panels) and
  remove the "Dashboard day-summary hero" item from `docs/TODO.md`.
- Run `npm run lint` (`--max-warnings 0`), `npm run build`, `npm test`, and the
  Playwright a11y suite if feasible.

## Relevant files

- `src/components/dashboard/DaySummaryHero.tsx` - new hero (ring + pills + status).
- `src/utils/dayStatus.ts` (or co-located) - extracted status-tier helper.
- `src/components/Dashboard.tsx` - swap in hero, drop banner/overview, rewire.
- `src/components/dashboard/OverviewStats.tsx`, `StatCard.tsx`,
  `MotivationalBanner.tsx` - removed.
- `src/components/dashboard/MicronutrientsPanel.tsx` - top-few + "View all".
- `src/components/dashboard/ChartSection.tsx` - remove pie, simplify weekly chart.
- `docs/FEATURES.md`, `docs/TODO.md` - docs.
- `tests/frontend/**` - new/updated tests.

## Verification

1. `npm run lint`, `npm run build`, `npm test` all pass.
2. Dashboard top shows a calorie ring with `consumed / target` and
   remaining/over, the absorbed status line, and color-coded P/C/F pills - no
   separate banner or four-card grid.
3. Micronutrients show a few tiles with a working "View all" expand/collapse.
4. Trends section shows weight, a single calories trend with a target line, and
   no macro pie chart.
5. Dark mode verified in both themes; a11y suite passes.

## Out of scope

- Changing goal/target calculations, the food logger, or AI prompt/endpoint
  logic.
- A separate detailed "Trends" page for the macro lines we remove (could be a
  future follow-up).
- Any change to the per-meal breakdown / per-meal insight built previously.

## Open questions / things to confirm during build

- Exact top-N micronutrients to show by default (proposed: Fiber, Iron,
  Calcium, Vitamin D).
- Whether to keep a 4th "Fiber" pill in the hero alongside P/C/F, or leave fiber
  to the micronutrient panel (proposed: keep hero to P/C/F).
- Whether to fully delete the macro-distribution/overview code or keep it for a
  future detailed view (proposed: delete to keep the tree clean).
