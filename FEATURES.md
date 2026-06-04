# FitPal Features 🌟

Everything FitPal can do — your AI-powered Indian nutrition tracker.

## 🔐 Accounts & Profile

- **Local authentication** — register with name, email, and password (hashed before storage).
- **Profile** — date of birth, gender, height, activity level, and diet preference (vegetarian / eggetarian / non-vegetarian).
- **Smart onboarding** — starting goals are estimated from your profile using the Mifflin–St Jeor BMR formula and your activity level.
- **Starting weight** — captured at registration so progress tracking begins immediately.
- **Profile in the navbar** — your name doubles as the profile entry point, right beside Logout.

## 🤖 Agentic AI Meal Logging

- **Natural language** — type things like *"2 rotis and a katori of dal for lunch at 1pm"* and FitPal builds the meal for you.
- **Log, update, or delete** — the assistant understands follow-ups like *"add a glass of milk to breakfast"* or *"delete my lunch"* and acts on today's meals.
- **Conversational preview** — proposed actions appear as a confirmable card before anything is saved.
- **Auto-scrolling chat** — the conversation keeps the latest message in view.
- **Confidence aware** — low/medium-confidence estimates are flagged so you know when to double-check.

## 🍛 Food Search & Manual Logging

- **AI food analysis** — search any Indian dish and get macro + micronutrient estimates, even with misspellings or regional names.
- **Confidence badges** — an "~estimated" tag appears when the AI is less certain.
- **Editable calories** — override the per-unit calories if an estimate looks off; doing so marks it as high confidence.
- **Flexible units** — log in serving, katori, bowl, plate, cup, glass, tbsp, tsp, piece, slice, gram, ml, or oz.
- **Unit re-estimation** — switching units re-estimates the nutrition for the new unit automatically.
- **Multi-food meals** — combine several items into one meal with a running nutrition total.
- **Meal types** — breakfast, morning snack, lunch, evening snack, dinner.
- **Notes** — add context to any meal.
- **Edit & delete** — change or remove logged meals anytime (delete asks for confirmation).

## � Date Navigation

- **Any-day logging & review** — a date picker on the Dashboard and Log Food pages lets you move to any past day.
- **Quick navigation** — previous/next-day arrows, a calendar picker, and a one-tap **Today** shortcut.
- **Everything follows the date** — stats, meal breakdowns, micronutrients, the weekly view, and the meal list all reflect the selected day.
- **Safe by default** — future dates are disabled, and a banner reminds you when you're logging for a day other than today.

## � Dashboard

- **Daily overview** — animated stat cards for calories, protein, carbs, and fats vs. targets, for the selected day.
- **Macro distribution** — pie chart of protein/carbs/fats.
- **Weekly trends** — line charts of recent nutrition.
- **Progress bars** — at-a-glance goal progress per nutrient.
- **AI meal suggestion** — a structured "what to eat next" card based on your day.
- **Nutrient suggestions** — one-click AI food ideas to close the gap on any tracked nutrient.

**Tracked nutrients**
- **Macros:** calories, protein, carbohydrates, fats
- **Micros:** fiber, vitamin A, vitamin C, vitamin D, calcium, iron, magnesium, potassium (with room for more)

## ⚖️ Weight Tracking

- **Log weight** in kg, with optional body-fat %.
- **Automatic BMI** based on your height.
- **Goal progress** — visual progress from start weight toward your target.
- **Change since last** — quick delta vs. your previous weigh-in.
- **Streaks** — current and longest streak to encourage consistency.
- **History table** — recent entries with inline edit (Enter to save, Esc to cancel) and delete.
- **Progress chart** — weight timeline with a target reference line.

## 🎯 Goals

- **Auto-calculated targets** from your profile, fully editable.
- **Weight goal** with selectable weekly loss rate (0.25–1 kg/week).
- **Calorie & macro targets** with sensible input bounds.
- **Micronutrient targets** for fiber, vitamins, and minerals.
- **AI goal suggestions** — let the assistant recommend goals with an explanation.
- **Calculate from weight-loss rate** — derive calorie/macro targets from your chosen pace.

## 👨‍🍳 Recipe Suggestions

- **AI-generated Indian recipes** tailored to your diet preference and goals.
- **Full detail** — ingredients, step-by-step instructions, prep time, servings.
- **Per-serving nutrition** for each recipe.
- **Empty-state guidance** when a search returns nothing.

## 💾 Data & Privacy

- **Local-first storage** — data is saved as JSON files by a small Express server on your machine.
- **Export / import** — back up and restore your data.
- **No third-party cloud** beyond your own Azure OpenAI resource for AI features.
- **Hashed passwords** and no analytics or tracking.

## 📱 Progressive Web App

- **Installable** on phone, tablet, and desktop (custom icons, maskable-safe).
- **Offline support** via service worker precaching.
- **Responsive** layouts tuned for small screens and touch targets.

## 🎨 Interface & Polish

- **Subtle motion** — page cross-fades, staggered dashboard cards, animated chat messages and lists, toast slide-ins, mobile-menu transitions, and button tap feedback (Framer Motion).
- **Keyboard-friendly** — Enter submits search/log/recipe forms; inline edits support Enter/Escape.
- **Accessible** — aria-labels on icon buttons and selects, focus styles, and autofocus on key inputs.
- **Helpful empty states** and clear loading indicators throughout.

## ⚡ Performance

- **Fast SPA** built with Vite, with PWA caching for instant repeat loads.
- **Structured AI outputs** (zod-validated) for reliable parsing.
- **Lightweight storage** — plain JSON files, easy to inspect and back up.

---

**FitPal** — complete nutrition tracking for Indian cuisine 🥗💪
