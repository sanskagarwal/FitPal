# FitPal Mobile Experience Improvements

## Context

FitPal is used primarily on mobile as an installable PWA. The core daily loop is:
open app -> log meals -> check dashboard. Friction in that loop and missing retention
hooks are the biggest opportunities. Six improvements were identified and prioritized
collaboratively, grouped into three tiers by effort.

---

## Tier 1 - Quick wins (no new backend, 1-2 sessions each)

### A. Dashboard empty-state CTA

**Problem:** When no meals are logged for the day, the `DaySummaryHero` shows all
zeros. This is a dead end - the user stares at empty progress with no prompt to act.

**What to add:** A conditional "Log your first meal" button rendered inside
`DaySummaryHero` only when `todayStats.mealsLogged === 0`. Tapping it navigates to
the Log Food page. Once any meal is logged the button disappears and never competes
with the rest of the dashboard.

**Files to change:**
- `src/components/dashboard/DaySummaryHero.tsx` - accept an optional `onLogMeal`
  callback prop; render the CTA button when `mealsLogged === 0`
- `src/components/Dashboard.tsx` - pass `onLogMeal` (calls the parent `onNavigate`
  with `'log-food'`); `Dashboard` already receives `onNavigate` from `App.tsx` via
  props or needs it added

**Note:** `Dashboard` is rendered in `App.tsx` with no props today. Add an
`onNavigate` prop to `Dashboard` and pass `setCurrentPage` from `App.tsx` at the
call site (`return <Dashboard onNavigate={setCurrentPage} />`).

---

### B. Chat draft persistence

**Problem:** If the user gets a phone call or the browser tabs away while mid-chat,
the in-progress meal conversation is lost entirely.

**What to add:** On every meaningful state change in `useMealChat.ts`, write the
serializable chat state to `sessionStorage` keyed by userId. On mount, restore it.
On `resetChat` / `confirmChatMeal`, clear it.

**State to persist** (from `useMealChat.ts`):
- `chatMessages: ChatMessage[]`
- `chatInput: string`
- `proposedMeal: MealChatResult | null`
- `proposedMealType: MealType`
- `mealTypeUncertain: boolean`
- `pendingImage: string | null` (base64 data URL; already compressed before stored in state)

**Key**: `meal-chat-draft-${user.id}` in `sessionStorage`.

**Files to change:**
- `src/components/foodLogger/useMealChat.ts` - add two effects: one to write on change,
  one to read on mount. Add a `clearDraft()` call at the start of `resetChat` and
  `confirmChatMeal`.

**Do not persist:** `chatLoading`, `chatPreparing`, `imageLoading` (transient flags).

---

### C. Swipe gestures for date navigation

**Problem:** Day navigation requires precise taps on small arrow buttons - hard on
mobile. Swipe left/right is the native gesture for "next/previous" on phones.

**What to add:** Install `react-swipeable` (small, no transitive deps). Wrap the
main content area in `Layout.tsx` with a `<Swipeable>` that calls `goToPreviousDay`
on swipe-right and `goToNextDay` on swipe-left. Use `delta: 60` to avoid accidental
triggers during vertical scroll. Do not use `preventScrollOnSwipe` (vertical scroll
must still work).

`goToPreviousDay` and `goToNextDay` already exist in `DateContext.tsx` and already
enforce the "no future date" clamp.

**Files to change:**
- `package.json` (root) - add `react-swipeable`
- `src/components/Layout.tsx` - import `useSwipeable` from `react-swipeable`, wrap
  the `<main>` content with the swipe handler

---

## Tier 2 - Core loop improvements (new backend endpoint or UI component)

### D. Recent meals re-log

**Problem:** Users eat the same meals repeatedly (especially breakfast). Re-entering
them every day is the biggest friction point in food logging.

**What to add:** A "Quick Re-log" horizontal scroll strip above the "Or add manually"
divider in the food logger, showing the last 5-6 meals from previous days. Tapping
one pre-fills the manual editor (meal type + foods) for immediate save as a NEW meal.

**Backend - new endpoint:**
- `GET /meals/:userId/recent?limit=N` (default 10)
- Query: `SELECT data FROM meals WHERE user_id = ? ORDER BY json_extract(data, '$.date') DESC LIMIT ?`
  (the expression index on `$.date` was added in migration v3, so this is fast)
- Add `recent()` method to the meal repository/service layer
- Add route in `server/routes/mealRoutes.ts`
- Add `getRecentMeals(userId, limit)` to `src/utils/db.ts`

**Frontend:**
- New `src/components/foodLogger/RecentMeals.tsx` - horizontally scrollable cards.
  Each card: meal type badge, food names (truncated), calorie total, "Re-log" button.
  Filter out today's meals (compare date portion only).
- New `startRelogMeal(meal: MealEntry)` in `useMealEditor.ts` - same as
  `startEditMeal` (sets `selectedFoods`, `mealType`, `notes`) but does NOT set
  `editingMealId`, so the save path calls `saveMealEntry` (creates a new record).
- Add `<RecentMeals>` to `FoodLogger.tsx` between the AI chat section and the
  "Or add manually" divider. Pass `startRelogMeal` as a prop.

---

### E. Notification settings UI

**Problem:** The backend already stores per-user notification times
(`breakfast/lunch/dinner/snack` as HH:mm strings, `enabled` boolean) and the API
helpers `saveNotificationSettings` / `getNotificationSettings` are in `db.ts`.
But there is no UI - users cannot configure reminders at all.

**What to add:** A "Reminders" card in the Profile page. On toggle-enable, request
browser `Notification` permission. Show time pickers for each meal type when enabled.
Save via existing `saveNotificationSettings`.

Note: this wires up the settings UI only. Actual push delivery (Web Push API, VAPID
keys, server-side scheduler) is a follow-on project already tracked in TODO.md.

**Files to change:**
- New `src/components/profile/NotificationSettingsCard.tsx` - card with toggle +
  four `<input type="time">` fields (breakfast/lunch/dinner/snack)
- New `src/components/profile/useNotificationSettings.ts` - loads settings on mount
  via `getNotificationSettings`, owns the form state, calls `saveNotificationSettings`
  on save, and calls `Notification.requestPermission()` when `enabled` is toggled on
- `src/components/Profile.tsx` - import and render `<NotificationSettingsCard />`
  between the Appearance card and `<ProfileInfoCard />`

---

## Tier 3 - New feature surfaces (multiple sessions each)

### F. Saved / favorite foods

**Problem:** Frequently-used foods require re-searching every time. No persistence
of commonly-logged items exists.

**Backend:**
- Migration v4: `favorite_foods` table with `(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL)` + index on `user_id`
- `server/repositories/favoriteFoodRepository.ts` using `JsonCollectionRepository`
  (same pattern as meals/weights in `server/db/repository.ts`)
- Service, controller, routes: `GET /favorites/:userId`, `POST /favorites`,
  `DELETE /favorites/:userId/:id`
- Register in `server/app.ts`

**Frontend:**
- `src/utils/db.ts` - add `getFavoriteFoods`, `addFavoriteFood`, `removeFavoriteFood`
- `src/components/foodLogger/useFoodSearch.ts` - load favorites on mount; toggle
  adds/removes via API + updates local state
- `src/components/foodLogger/FoodSearch.tsx` - star icon on each result; a
  "Favorites" section shown when the search query is empty

---

### G. Water tracking

**Problem:** Hydration is referenced in AI insights but there is no way to log water intake.

**Backend:**
- Migration v4 or v5: `water_intake` table `(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL)` + index on `user_id`
- Repository using `JsonCollectionRepository`; service, controller, routes
- Endpoints: `GET /water/:userId?date=YYYY-MM-DD` (returns cups for the day),
  `POST /water/:userId` (log a cup), `DELETE /water/:userId/:id`

**Frontend:**
- New `src/components/dashboard/WaterPanel.tsx` on the Dashboard (in the
  "Today's progress" section, after micronutrients)
- UI: cup icons, `+` / `-` buttons, progress count vs. daily goal
- Daily water goal: new optional field `targetWaterCups` on `UserGoals` (default 8);
  add to the Goals page form
- AI hydration insight can reference the logged count

---

## Execution order

| # | Feature | Effort | Value |
|---|---------|--------|-------|
| 1 | A - Dashboard empty-state CTA | ~1 hr | High (immediate, no backend) |
| 2 | B - Chat draft persistence | ~2 hrs | High (immediate, no backend) |
| 3 | C - Swipe gestures | ~2 hrs | Medium (1 package install) |
| 4 | D - Recent meals re-log | ~4 hrs | Very high (biggest daily-loop win) |
| 5 | E - Notification settings UI | ~3 hrs | High (unblocks push work) |
| 6 | F - Saved/favorite foods | ~1 day | Medium-high |
| 7 | G - Water tracking | ~2 days | Medium |

---

## Verification (after each feature)

- `npm run lint` - zero warnings policy
- `npm run build` - confirm no type errors
- `cd server && npm run build` - confirm server types pass
- Manual test on mobile viewport in browser DevTools
- **A**: visit dashboard with no meals logged, confirm CTA appears; log a meal, confirm it disappears
- **B**: background the tab mid-chat, return, confirm state is restored
- **C**: use DevTools touch simulation to swipe left/right
- **D**: re-log a meal, confirm the original meal is untouched and a new entry is created with today's date
- **E**: toggle on, confirm browser permission prompt fires; save times, reload, confirm they persist
