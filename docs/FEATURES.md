# FitPal Features

Everything FitPal can do, your AI-powered Indian nutrition tracker.

## Accounts and profile

- **Local authentication.** Register with name, email, and password (hashed
  before storage). The session is a signed JWT stored in an httpOnly cookie.
- **Profile.** Date of birth, gender, height, activity level, and diet
  preference (vegetarian, eggetarian, or non-vegetarian).
- **Smart onboarding.** Starting goals are estimated from your profile using the
  Mifflin-St Jeor BMR formula and your activity level.
- **Starting weight** is captured at registration so progress tracking begins
  immediately.
- **Self-service account deletion.** Permanently delete your account and all of
  your data from the profile page, gated behind a password and typed
  confirmation.

## Agentic AI meal logging

- **Natural language.** Type things like *"2 rotis and a katori of dal for lunch
  at 1pm"* and FitPal builds the meal for you.
- **Snap a photo.** Attach a picture of your plate (camera or upload) and a
  vision model identifies the foods and portions, flowing through the same
  editable proposal before saving. The photo is shown alongside the logged meal.
- **Log, update, or delete.** The assistant understands follow-ups like *"add a
  glass of milk to breakfast"* or *"delete my lunch"* and acts on today's meals.
- **Conversational preview.** Proposed actions appear as a confirmable card
  before anything is saved.
- **Auto-scrolling chat.** The conversation keeps the latest message in view.
- **Confidence aware.** Low and medium-confidence estimates are flagged so you
  know when to double-check.

## Food search and manual logging

- **AI food analysis.** Search any Indian dish and get macro and micronutrient
  estimates, even with misspellings or regional names.
- **Confidence badges.** An "~estimated" tag appears when the AI is less
  certain.
- **Editable calories.** Override the per-unit calories if an estimate looks
  off; doing so marks it as high confidence.
- **Flexible units.** Log in serving, katori, bowl, plate, cup, glass, tbsp,
  tsp, piece, slice, gram, ml, or oz.
- **Unit re-estimation.** Switching units re-estimates the nutrition for the new
  unit automatically.
- **Multi-food meals.** Combine several items into one meal with a running
  nutrition total.
- **Meal types.** Breakfast, morning snack, lunch, evening snack, dinner.
- **Notes.** Add context to any meal.
- **Edit and delete.** Change or remove logged meals anytime (delete asks for
  confirmation).

## Date navigation

- **Any-day logging and review.** A date picker on the Dashboard and Log Food
  pages lets you move to any past day.
- **Quick navigation.** Previous and next-day arrows, a calendar picker, and a
  one-tap **Today** shortcut.
- **Everything follows the date.** Stats, meal breakdowns, micronutrients, the
  weekly view, and the meal list all reflect the selected day.
- **Safe by default.** Future dates are disabled, and a banner reminds you when
  you are logging for a day other than today.

## Dashboard

- **Day-at-a-glance hero.** A calorie ring shows how much you have eaten versus
  your target, the calories left for the day (or how far over), a short status
  line, and compact protein/carbs/fats pills color-coded by progress.
- **Per-meal breakdown.** Each meal type (breakfast, morning snack, lunch,
  evening snack, dinner) shown against its own recommended calorie and macro
  targets, split from your daily goal. Calorie progress bars, macro-vs-target
  chips, and "low protein"/"low fiber" badges flag where a logged meal fell
  short; meals you have not logged yet appear as muted target rows.
- **Per-meal AI insight.** On any logged meal, get an on-demand AI review of how
  it did against its target, what it lacked, how to improve that meal, and how
  to make up the gap in your later meals.
- **Micronutrients.** A focused set of key micros up front, with "View all" to
  expand the rest. Each tile offers one-click AI food ideas to close the gap.
- **Weekly calorie trend.** A clean line chart of the week's calories with your
  target marked.
- **AI meal suggestion.** A structured "what to eat next" card based on your day.

**Tracked nutrients**

- **Macros:** calories, protein, carbohydrates, fats.
- **Micros:** fiber, vitamin A, vitamin C, vitamin D, calcium, iron, magnesium,
  potassium (with room for more).

## Weight tracking

- **Log weight** in kg, with optional body-fat percentage.
- **Automatic BMI** based on your height.
- **Goal progress.** Visual progress from start weight toward your target.
- **Change since last.** Quick delta vs. your previous weigh-in.
- **Streaks.** Current and longest streak to encourage consistency.
- **History table.** Recent entries with inline edit (Enter to save, Esc to
  cancel) and delete.
- **Progress chart.** Weight timeline with a target reference line.

## Goals

- **Auto-calculated targets** from your profile, fully editable.
- **Weight goal** with selectable weekly loss rate (0.25 to 1 kg/week).
- **Calorie and macro targets** with sensible input bounds.
- **Micronutrient targets** for fiber, vitamins, and minerals.
- **AI goal suggestions.** Let the assistant recommend goals with an
  explanation.
- **Calculate from weight-loss rate.** Derive calorie and macro targets from
  your chosen pace.

## Recipe suggestions

- **AI-generated Indian recipes** tailored to your diet preference and goals.
- **Full detail.** Ingredients, step-by-step instructions, prep time, servings.
- **Per-serving nutrition** for each recipe.
- **Empty-state guidance** when a search returns nothing.

## Data and privacy

- **Local-first storage.** Data lives in a local SQLite database managed by a
  small Express server on your machine.
- **Export and import.** Back up and restore your data.
- **Account deletion.** Remove your account and all associated data at any time.
- **No third-party cloud** beyond the AI provider you choose.
- **Hashed passwords** and no analytics or tracking.

## Progressive Web App

- **Installable** on phone, tablet, and desktop (custom icons, maskable-safe).
- **Offline support** via service worker precaching.
- **Responsive** layouts tuned for small screens and touch targets.
- **Bottom navigation bar** on phones for thumb-friendly switching between
  pages, with a More sheet for secondary actions; the bar tucks away as you
  scroll down and returns as you scroll up.

## Interface and polish

- **Dark mode.** Choose System (follows your operating system color scheme),
  Light, or Dark from the header or Profile; the choice is saved on your device.
  Contrast is tuned for WCAG AA in both light and dark themes.
- **Subtle motion.** Page cross-fades, staggered cards, animated chat and lists,
  and toast slide-ins (Motion).
- **Keyboard-friendly and accessible.** Enter and Escape on forms and inline
  edits, aria-labels, focus styles, and autofocus on key inputs.
- **Helpful empty states** and clear loading indicators throughout.

---

FitPal: complete nutrition tracking for Indian cuisine.
