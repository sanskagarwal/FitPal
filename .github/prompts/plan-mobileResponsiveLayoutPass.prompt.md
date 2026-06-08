# Plan: Mobile Responsive Layout Pass

The nav shell (top bar → hamburger at `md`) and most content grids are already responsive. The pass targets a handful of real breakages, sub-44px touch targets, missing safe-area handling, chart clipping on narrow cards, and spacing polish — all with Tailwind utilities only, no new deps or routing changes.

## Steps

### Phase 0 — Global foundation (do first)
1. [index.html](index.html#L6): add `viewport-fit=cover` to the viewport meta to enable safe-area insets.
2. [src/index.css](src/index.css#L18): add safe-area padding for the sticky header/root via `env(safe-area-inset-*)`; sanity-check `overflow-y: scroll` vs. mobile pull-to-refresh.

### Phase 1 — Clear breakages (parallel)
3. [Toast.tsx](src/components/Toast.tsx#L62): `right-4 w-full max-w-md` clips off-screen left on phones → add `left-4` / clamp width.
4. [foodLogger/TodayMealsHistory.tsx](src/components/foodLogger/TodayMealsHistory.tsx#L104): `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`.
5. [auth/RegisterFields.tsx](src/components/auth/RegisterFields.tsx#L13) and [#L42](src/components/auth/RegisterFields.tsx#L42): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (fixes cramped date input + truncated placeholders).
6. [goals/AIGoalSuggestion.tsx](src/components/goals/AIGoalSuggestion.tsx#L13): add `flex-col gap-2 sm:flex-row` fallback.
7. [CalendarPopover.tsx](src/components/CalendarPopover.tsx#L84): fixed `w-72` centered → add `max-w-[calc(100vw-2rem)]` edge guard.

### Phase 2 — Cramped grids step-down (parallel)
8. [dashboard/MicronutrientsPanel.tsx](src/components/dashboard/MicronutrientsPanel.tsx#L70), [goals/MicronutrientTargets.tsx](src/components/goals/MicronutrientTargets.tsx#L23): add a `sm:` step. [FoodLogger.tsx](src/components/FoodLogger.tsx#L84) meal selector: add `sm:grid-cols-3`.

### Phase 3 — Touch targets (~44px) (parallel)
9. [Layout.tsx](src/components/Layout.tsx#L77) hamburger (24px → padded); [DateNavigator.tsx](src/components/DateNavigator.tsx#L20) + [CalendarPopover.tsx](src/components/CalendarPopover.tsx#L98) arrows/day cells; "Suggest" buttons [StatCard.tsx](src/components/dashboard/StatCard.tsx#L49) / [MicronutrientCard.tsx](src/components/dashboard/MicronutrientCard.tsx#L32); edit/delete icons [TodayMealsHistory.tsx](src/components/foodLogger/TodayMealsHistory.tsx#L54) / [WeightHistoryTable.tsx](src/components/weight/WeightHistoryTable.tsx#L138); Toast close.

### Phase 4 — Chart tuning (parallel)
10. [dashboard/ChartSection.tsx](src/components/dashboard/ChartSection.tsx#L23): pie `outerRadius={100}` + outside labels clip on narrow cards; line legend crowding. [weight/WeightChart.tsx](src/components/weight/WeightChart.tsx#L27): `YAxis width={70}` + ReferenceLine label overlap.

### Phase 5 — Spacing/heading polish (parallel, low priority)
11. [Layout.tsx](src/components/Layout.tsx#L146): `px-4 py-8` → `px-4 sm:px-6 lg:px-8 py-6 sm:py-8`; downscale page `h1 text-3xl` → `text-2xl sm:text-3xl`.

## Verification
1. `npm run lint` (`--max-warnings 0`) and `npm run build`.
2. Manual sweep in DevTools device toolbar at 320/360/390/768px across all pages, plus calendar popover, toast, and delete-account modal.
3. Optional: add a mobile project (`devices['Pixel 5']`) in [playwright.config.ts](playwright.config.ts#L29) for a smoke spec — e2e is Desktop Chrome only today.
4. iOS PWA: confirm sticky header clears the notch.
5. Update [docs/TODO.md](docs/TODO.md) to mark the responsive pass done.

## Decisions
- Keep state-based routing; Tailwind utilities only, no new deps.
- Weight history table stays `overflow-x-auto` (acceptable) rather than a card refactor.
- Bottom nav / pull-to-refresh are a separate Low-priority TODO — excluded here.

## Further Considerations
1. Weight history table on phones: keep horizontal scroll (recommended, minimal) vs. refactor to stacked cards (more work, better UX). Recommend keep.
2. Mobile e2e coverage: add a Pixel viewport Playwright project now vs. rely on manual checks. Recommend adding a small smoke project.
