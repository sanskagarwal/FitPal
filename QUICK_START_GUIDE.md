# Quick Start Guide - New Features

## 🎉 Welcome to the Enhanced FitPal!

All your requested features have been implemented. Here's how to use them:

---

## 1. 📊 View Micronutrients & Fiber

**Go to:** Dashboard (automatically shown when you log in)

**What you'll see:**
- "Today's Micronutrients" section with 8 key nutrients
- Fiber tracking integrated into meal breakdowns
- Color-coded cards showing your progress

**Try it:**
1. Log some meals with the Food Logger
2. Return to Dashboard
3. Scroll to see micronutrient totals

---

## 2. 🍽️ Use New Meal Types

**Go to:** Log Food page

**What's new:**
- Meal types now ordered: Breakfast → Morning Snack → Lunch → Evening Snack → Dinner

**Try it:**
1. Click "Log Food" in navigation
2. Select "Morning Snack" or "Evening Snack"
3. Add your food items

---

## 3. 📏 Add Food with Flexible Quantities

**Go to:** Log Food page

**What's new:**
- Multiple unit types: cup, tbsp, tsp, piece, serving, gram, oz
- Enter decimal quantities: 1.5 cups, 0.5 tbsp, etc.

**Try it:**
1. Search for a food (e.g., "dal")
2. Add it to your meal
3. Change quantity to "1.5" and select "cup" from dropdown
4. Or use "2" and select "tbsp"

---

## 4. 🔍 View Meal-wise Breakdown

**Go to:** Dashboard

**What's new:**
- "Today's Meal Breakdown" section shows macros for each meal
- See exactly which meal contributed what

**Try it:**
1. Log meals for different meal types
2. Go to Dashboard
3. See breakdown by breakfast, snacks, lunch, dinner

---

## 5. 🤖 Get AI Meal Suggestions

**Go to:** Dashboard

**What's new:**
- "AI Meal Suggestion" card with "Get Suggestion" button
- Analyzes what you need to meet daily goals
- Suggests appropriate Indian meals

**Try it:**
1. Log some meals (not all your daily calories)
2. Scroll to "AI Meal Suggestion" section
3. Click "Get Suggestion"
4. AI will suggest meals based on remaining goals

**Note:** Requires Azure OpenAI credentials in `.env` file

---

## 6. 🎯 Get AI Goal Recommendations

**Go to:** Goals page

**What's new:**
- Purple "AI-Powered Goal Suggestions" card
- "Get AI Suggestions" button
- Personalized recommendations based on your profile

**Try it:**
1. Go to Goals page
2. Find the purple AI suggestions box
3. Click "Get AI Suggestions"
4. Review recommended calories, macros, and explanation
5. Click "Update Goals" to save

**Note:** Requires Azure OpenAI credentials in `.env` file

---

## 7. ⚖️ Set Weight Loss Rate

**Go to:** Goals page

**What's new:**
- Weight loss rate dropdown (0.25kg to 1kg per week)
- "Calculate Goals from Weight Loss Rate" button
- Auto-calculates calorie deficit and macros

**Try it:**
1. Go to Goals page
2. Find "Weight Loss Rate" dropdown
3. Select your desired rate (e.g., "0.5 kg/week")
4. Click "Calculate Goals from Weight Loss Rate"
5. Review auto-calculated values
6. Click "Update Goals" to save

**Rates explained:**
- 0.25 kg/week: Slow & steady, easiest to maintain
- 0.5 kg/week: Moderate, recommended for most
- 0.75 kg/week: Aggressive, requires discipline
- 1 kg/week: Very aggressive, challenging

---

## 8. 💪 Get Motivational Messages

**Go to:** Dashboard

**What's new:**
- Dynamic message at top of dashboard
- Changes based on your calorie consumption
- Color-coded for quick understanding

**Try it:**
1. Log meals throughout the day
2. Watch the message change:
   - Early: "Great start! Plenty of room..."
   - Mid-day: "You're on track!"
   - Near goal: "You've reached your goal!"
   - Over goal: "You're X% over..."

---

## 9. 👤 Edit Your Profile

**Go to:** Profile page (new in navigation)

**What's new:**
- Dedicated Profile page
- Edit age, gender, height, activity level
- Changes automatically update BMR calculations

**Try it:**
1. Click "Profile" in navigation menu
2. Update any field (age, height, activity level)
3. Click "Update Profile"
4. Go back to Goals to see how it affects recommendations

**Editable:**
- Age
- Gender
- Height (cm)
- Activity Level (sedentary to very active)

**Read-only (for security):**
- Name
- Email

---

## 🔧 Setup for AI Features

To enable AI meal suggestions and goal recommendations:

1. Create `.env` file in project root (if not exists)
2. Add your Azure OpenAI credentials:
   ```env
   VITE_AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
   VITE_AZURE_OPENAI_KEY=your-api-key-here
   VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
   ```
3. Restart dev server: `npm run dev`

**Without AI credentials:**
- App works normally
- AI features show fallback calculations/suggestions
- All other features work 100%

---

## 📱 Navigation Overview

**Updated menu:**
- 🏠 Dashboard - See all your stats, micronutrients, meal suggestions
- 🍽️ Log Food - Track meals with flexible quantities
- ⚖️ Weight - Track your weight progress
- 🎯 Goals - Set targets with AI help and weight loss rates
- 📖 Recipes - Get healthy recipe ideas
- 👤 Profile - **NEW!** Edit your personal metrics

---

## 💡 Pro Tips

1. **Track consistently** - Log all meals for accurate micronutrient tracking
2. **Use AI suggestions** - When stuck, get meal ideas based on remaining goals
3. **Set realistic weight loss** - 0.5kg/week is sustainable for most people
4. **Update profile regularly** - Keep age, weight in Goals, activity level current
5. **Check meal breakdowns** - Identify which meals are macro-heavy
6. **Monitor micronutrients** - Don't just focus on calories!
7. **Use flexible quantities** - 1.5 cups is more accurate than "2 servings"

---

## 🐛 Troubleshooting

**AI features not working?**
- Check `.env` file has correct Azure credentials
- Restart dev server after adding credentials
- Check browser console for API errors

**Meal types not showing correctly?**
- Clear browser cache and reload
- Check you're using the latest build

**Profile changes not reflecting?**
- Make sure you clicked "Update Profile"
- Refresh the page
- Check Goals page to see updated calculations

---

## 🚀 Next Steps

1. ✅ Log your first meal with new quantity units
2. ✅ Check your micronutrient intake on Dashboard
3. ✅ Set a weight loss rate in Goals
4. ✅ Try AI meal suggestions
5. ✅ Update your profile information
6. ✅ Track progress over time!

---

**Enjoy your enhanced FitPal experience! 🎊**

Need help? Check `IMPLEMENTATION_SUMMARY.md` for technical details.
