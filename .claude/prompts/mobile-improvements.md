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

**What to add:** Install `react-swipeable` and wrap `<main>` in `Layout.tsx`.
Use `delta: 60` and `rotationAngle: 30` (built-in direction discrimination) so
vertical scroll never triggers a day change.

**Package decision:** `react-swipeable` v7.0.2 (Nov 2024) - zero runtime deps,
React 19 compatible, handles direction discrimination and pinch-zoom safety
internally. Lighter than `@use-gesture/react` and sufficient for this use case.

**Page scope:** Gate the handler on `currentPage`. Only fire on `'dashboard'` and
`'log-food'` - those are the only pages with a `DateNavigator`. `Layout` already
receives `currentPage` as a prop.

**Conflict with feature D (RecentMeals horizontal strip):** The re-log strip is a
horizontal scroller that will sit inside `<main>`. A swipe started on that strip will
bubble up and also trigger a day change. Fix when building feature D by wrapping
`<RecentMeals>` with `data-no-swipe` and bailing in the swipe handler if the event
target is inside such a container, or by using `e.stopPropagation()` on the strip.

`goToPreviousDay` and `goToNextDay` already exist in `DateContext.tsx` and already
enforce the "no future date" clamp.

**Files to change:**
- `package.json` (root) - add `react-swipeable` (done)
- `src/components/Layout.tsx` - import `useSwipeable` + `useDate` context; build
  handler gated on `currentPage`; spread on `<main>`

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

### E. Push notifications with quick actions

**Depends on:** G (water tracking) - the "Log Water" action targets the WaterPanel
built in G.

**Goal:** Scheduled meal-time reminders that include action buttons ("Log Food",
"Log Water") so the user can act without opening the app first.

**Scope decision pending** (see note below) - the detailed implementation plan will
be written once the push delivery approach is agreed.

**What this feature requires at minimum:**

*Settings UI (small, can ship independently):*
- New `src/components/profile/NotificationSettingsCard.tsx` - toggle + four
  `<input type="time">` fields (breakfast/lunch/dinner/snack)
- New `src/components/profile/useNotificationSettings.ts` - loads/saves via
  `getNotificationSettings` / `saveNotificationSettings`; calls
  `Notification.requestPermission()` on enable
- `src/components/Profile.tsx` - render `<NotificationSettingsCard />`

*Full push pipeline (required for background notifications):*
- VAPID key pair: generate once, store public key in env, private key server-side
- Push subscription management: client calls `pushManager.subscribe()`, server
  stores the endpoint + keys per user
- Server-side scheduler: fires at each user's configured times, sends push via
  Web Push API
- Service worker `push` handler: calls `self.registration.showNotification()` with
  `actions: [{action:'log-food',...}, {action:'log-water',...}]`
- Service worker `notificationclick` handler: resolves action -> calls
  `clients.openWindow('/?page=log-food')` or `/?page=dashboard`
- `App.tsx` bootstrap: on mount, read `?page=` param from URL and set
  `currentPage` accordingly (FitPal uses state-based navigation, not React Router,
  so deep links must be parsed manually)

**iOS caveat:** Web Push notification `actions` (buttons) are not rendered on
iOS Safari regardless of PWA install status as of mid-2025 - confirm current
support before finalising the action-button design. Tapping the notification
body itself still opens the app and the bootstrap deep-link path handles that.

**Open scope question:** Full push pipeline is a multi-day effort (VAPID, server
scheduler, SW push handler). An interim option is: ship the settings UI now
(stores times, requests Notification permission) with a note that background
delivery is follow-on. Decide before starting implementation.

---

## Execution order

| # | Feature | Effort | Value |
|---|---------|--------|-------|
| 1 | A - Dashboard empty-state CTA | ~1 hr | High (immediate, no backend) |
| 2 | B - Chat draft persistence | ~2 hrs | High (immediate, no backend) |
| 3 | C - Swipe gestures | ~2 hrs | Medium (no new dependency) |
| 4 | D - Recent meals re-log | ~4 hrs | Very high (biggest daily-loop win) |
| 5 | G - Water tracking | ~2 days | Medium |
| 6 | E - Push notifications + quick actions | TBD (scope decision needed) | High |

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
- **G**: log water cups, confirm count persists across page refresh; goal progress bar updates
- **E**: TBD once scope is decided
