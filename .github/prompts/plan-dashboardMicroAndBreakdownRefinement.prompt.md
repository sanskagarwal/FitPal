# Plan: Dashboard micro cards + meal breakdown refinement

## Goal

Tighten the "Today's progress" section: make the micronutrient cards much more
compact (and mobile-friendly) while keeping the per-micro "Suggest foods"
action, and revamp the meal breakdown so it reads as a clean, scannable list
instead of a wall of nested boxes and redundant badges.

## Decisions (confirmed)

- **Micronutrients:** compact rows - `Fiber 12 / 30g` + a thin progress bar +
  an **icon-only lightbulb** "Suggest foods" button (aria-label, 44px touch
  target). Stay as their own card inside "Today's progress" (do not merge into
  the hero).
- **Macros AI suggest:** nothing to do - the per-macro "Suggest Foods" action was
  already removed with `OverviewStats`/`StatCard` in the hero redesign. The AI
  coach (`MealSuggestionPanel`) + per-meal insights cover macro guidance.
- **Meal breakdown:** keep meals **always expanded**, **keep the mini progress
  bars in the macro chips** (per the specific choice), and **remove the
  redundant "Low X" shortfall badges**. Revamp the visuals so it's a lighter,
  less boxy list.

## Key facts (codebase)

- `MicronutrientCard.tsx`: `p-3` tile with label (sm), value (xl bold), target
  (xs), and a full-width text "Suggest" button (`min-h-11`). 8 of these in a
  `grid-cols-2 sm:3 md:4` grid in `MicronutrientsPanel.tsx` (now top-4 + "View
  all").
- `MealBreakdownTable.tsx`: each logged meal is a `bg-gray-50 dark:bg-gray-900
  border` box containing header (icon + label + `kcal / target`), a calorie
  progress bar, 4 `MacroChip`s (each with its own mini progress bar), "Low X"
  shortfall badges, a "Get insight" button, and an expandable insight panel.
  Unlogged meals render as a dashed box with "Not logged yet".
- Macro colors: Protein red-500, Carbs blue-500, Fats amber-500, Fiber
  purple-500. Suggest action currently uses `Lightbulb`.
- Dark mode + WCAG AA required (Playwright a11y suite checks both themes); touch
  targets >= 44px.

## Phases

### Phase 1 - Compact micronutrient rows

- Rework `MicronutrientCard.tsx` into a compact row:
  - One line: label on the left, `value / target unit` on the right (tabular
    nums), with a thin progress bar (`h-1`/`h-1.5`) under it tinted by the
    nutrient's accent color.
  - Replace the text "Suggest" button with an **icon-only lightbulb** button
    (`aria-label="Suggest foods rich in {label}"`), kept to a 44px touch target
    via padding, placed at the row's right edge.
  - Keep the per-nutrient accent color (smaller footprint - e.g. colored bar +
    value text rather than a big tinted tile background, to reduce heaviness).
- `MicronutrientsPanel.tsx`: switch the grid to a denser layout that suits rows
  (e.g. `grid-cols-1 sm:grid-cols-2` so each row has space for label + value +
  button), keep the top-4 default + "View all" toggle. Verify mobile wrapping.

### Phase 2 - Meal breakdown visual revamp

- In `MealBreakdownTable.tsx`:
  - Replace the heavy per-meal bordered boxes with a lighter list: rows
    separated by dividers (`divide-y`) inside the card, instead of nested
    `bg-gray-50 border` boxes - removes the "box in a box" feel.
  - Keep the header (icon + label + `kcal / target`) and the calorie progress
    bar.
  - Keep the 4 `MacroChip`s **with their mini progress bars** (unchanged), but
    drop the separate "Low X" shortfall badges block (the chip colors + bars
    already convey shortfalls).
  - Make unlogged meals a slim single-line row (icon + label + "Target X kcal",
    muted) instead of a full dashed box.
  - Keep the "Get insight" button + expandable insight panel.
- Remove the now-unused shortfall computation and `SHORTFALL_THRESHOLD` if no
  longer referenced.

### Phase 3 - Tests + docs

- Update/extend `MealBreakdownTable` / micro tests if present; otherwise add a
  light render test for the compact micro row (renders value/target + an
  accessible "Suggest foods" control) and for the breakdown (no "Low X" badge,
  macro chips still present).
- Update `docs/FEATURES.md` wording if the micro/breakdown description changes
  materially.
- Run `npm run lint`, `npm run build`, `npm test` (+ a11y if feasible).

## Relevant files

- `src/components/dashboard/MicronutrientCard.tsx` - compact row + icon button.
- `src/components/dashboard/MicronutrientsPanel.tsx` - grid/layout for rows.
- `src/components/dashboard/MealBreakdownTable.tsx` - lighter list, drop badges,
  slim unlogged rows.
- `docs/FEATURES.md` - wording if needed.
- `tests/frontend/**` - tests.

## Verification

1. `npm run lint`, `npm run build`, `npm test` pass.
2. Micronutrients render as compact rows with a thin progress bar and an
   icon-only "Suggest foods" button that still triggers the nutrient-suggestion
   flow; layout holds on a narrow mobile width with 44px touch targets.
3. Meal breakdown reads as a clean divided list: calorie bar + macro chips (with
   mini-bars) per logged meal, no separate shortfall badges, slim rows for
   unlogged meals; "Get insight" still works.
4. Dark mode verified in both themes.

## Out of scope

- Changing targets/goals math, the per-meal insight endpoint, or the hero.
- Merging micronutrients into the hero (explicitly kept separate).
- Re-adding any per-macro AI suggest action.
