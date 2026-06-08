# Plan: Color Contrast & Visibility Fix (light + dark)

Audit and fix **all** low-contrast cases across FitPal in both themes: repair light-mode pairs (e.g. `text-gray-400` on white, `bg-*-50`/`text-*-800`) and add the missing `dark:` variants everywhere. Today only `.card` and `.input-field` get dark styling in `src/index.css` (lines 165-174). We keep the `prefers-color-scheme` (media) strategy — the user-facing theme toggle stays a separate TODO item. Since this is **Tailwind v4**, `dark:` utilities already follow the media query, so no strategy change is needed now.

## Standard color mapping (documented once, applied consistently)

- Surfaces: `bg-white`→`dark:bg-gray-800`, `bg-gray-50`→`dark:bg-gray-900`, `bg-gray-100/200`→`dark:bg-gray-700`
- Text: `text-gray-900`→`dark:text-gray-100`, `700/800`→`dark:text-gray-200`, `500/600`→`dark:text-gray-400`; bump too-light `text-gray-400` body text to `gray-500/600` for AA
- Borders: `border-gray-200/300`→`dark:border-gray-700`
- Accents/alerts/gradients: `bg-{c}-50`→`dark:bg-{c}-900/30`, `text-{c}-700/800`→`dark:text-{c}-200/300`, `border-{c}-200`→`dark:border-{c}-800`

## Steps (phases 2–7 are independent and parallelizable after step 1)

1. **Base CSS** — `src/index.css`: add dark variants for `.btn-*`, `.stat-card`, `.prose`, scrollbar, `.spinner`; add shared `.alert-{info|success|warning|error}` classes (light+dark) for the repeated alert/banner pattern; document the mapping in a comment.
2. **Dashboard (worst offenders)** — `MotivationalBanner` (color-object strings), `MicronutrientsPanel` + `MicronutrientCard` (8 nutrient chips), `InsightPanel` (gradient + `text-gray-400` close btn + 7 category visuals), `MealSuggestionPanel`, `NutrientSuggestionPanel`, `StatCard`, `OverviewStats`, `MealBreakdownTable`, `WeightProgress`, `ChartSection`. *Check recharts axis/tick/grid colors (set via props, not Tailwind) and make theme-aware.*
3. **Shell/nav** — `Layout.tsx` (~13 instances), `DateNavigator`, `CalendarPopover`, `App.tsx`, `Toast`, `Spinner`.
4. **FoodLogger** — `FoodLogger.tsx`, `FoodSearch`, `MealProposal`, `SelectedFoodsList`, `TodayMealsHistory`, `MealChat`, `FoodQuantityInput`, `ConfidenceBadge`.
5. **Profile** — `ProfileForm` (11 labels, `bg-gray-100` inputs, message banners), `ProfileInfoCard`, `DataManagementCard`, `DangerZoneCard`.
6. **Weight** — `WeightHistoryTable`, `WeightStats`, `LogWeightForm`, `WeightChart` (recharts colors).
7. **Goals/Auth/Recipes** — `Goals.tsx`, `Recipes.tsx`, `AuthPage`, `RegisterFields`, `AIGoalSuggestion`, `GoalsTips`, `MacroTargets`, `MicronutrientTargets`, `WeightGoalSection`.
8. **Automated a11y test** — add devDep `@axe-core/playwright`; new `tests/e2e/accessibility.spec.ts` asserting no serious/critical color-contrast violations on key pages in **both** light and dark via `page.emulateMedia({ colorScheme })`; fix anything it flags.
9. **Docs** — update `docs/TODO.md` to mark this item done; leave the dark-mode toggle item intact.

## Relevant files

- `src/index.css` (lines 51-174) — base component classes + the single dark `@media` block to extend; add shared alert classes + mapping comment
- `tailwind.config.js` — no change needed (media default stays); only primary palette is custom, grays use Tailwind defaults
- `src/components/**` (~30 files listed above) — add `dark:` variants and light-mode contrast fixes per mapping
- `playwright.config.ts` + new `tests/e2e/accessibility.spec.ts` — automated contrast checks

## Verification

1. `npm run lint` (`--max-warnings 0`)
2. `npm run build` (tsc + vite)
3. `npm test` (vitest)
4. `npm run test:e2e` including the new `accessibility.spec.ts` (light + dark, zero contrast violations)
5. Manual spot-check of key screens in both themes (OS scheme / devtools emulate)

## Decisions

- Inline `dark:` utilities + shared CSS classes for the repeated alert/banner pattern.
- Keep media strategy; exclude the theme toggle (separate item).
- Add `@axe-core/playwright` (approved) for automated WCAG AA contrast verification in both themes.

## Further consideration

1. Recharts components (`WeightChart`, `ChartSection`) often hardcode axis/tooltip/grid colors via props rather than Tailwind, so they need explicit theme-aware values — but with media strategy there's no JS theme signal. Recommendation: **Option A** read `prefers-color-scheme` via a tiny `matchMedia` hook to pick chart colors (clean, reusable later for the toggle); Option B use CSS-variable-driven colors; Option C leave charts for the toggle item. Recommended: Option A.
