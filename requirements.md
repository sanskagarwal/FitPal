Create a modern web application called **FitPal**, focused on nutrition, weight management, and food intake tracking, specifically for Indian foods and meals. The app should be built using **React** (no backend database; all data is stored in local files or browser storage, e.g., IndexedDB/LocalStorage). Prioritize a **simple, clean design** for easy usability.

**Key Features:**

1. **User Registration & Login (Local Only):**
   - Simple local user profile creation (no social or cloud login).
   - All data stored locally (localStorage or downloadable files).
   - Option to export/import profile and nutrition logs as files (CSV/JSON).

2. **Food Logging via GPT Model:**
   - User enters or searches Indian foods/meals.
   - Integrate with **Azure OpenAI GPT-4o** to:
     - Suggest foods or meals, even with misspellings or incomplete entries.
     - Provide detailed macro & micronutrient analysis for Indian foods (calories, carbs, proteins, fats, vitamins, minerals).
     - Ensure outputs are culturally accurate and easy to read.

3. **Macro & Micronutrient Tracking Dashboard:**
   - Visualize daily/weekly progress compared to user-defined goals.
   - Track total intake of calories, macros, and key micronutrients.

4. **Weight & Body Parameter Tracking:**
   - Users log weight, BMI, and body fat %.
   - Set weight reduction or body composition goals.
   - Progress displayed as streaks and visual graphs/charts over time.
   - Smart insights/suggestions via GPT-4o on diet tweaks for weight & body goals.

5. **Meal Reminders:**
   - Push notifications using PWA features (browser notifications).
   - Remind users when it’s time for meals.

6. **Custom Nutrition Goals:**
   - Set personal goals for nutrients, body weight, and fitness.
   - Adjust targets as needed.

7. **Recipe Suggestions:**
   - GPT-4o suggests healthy Indian recipes or meal alternatives based on user’s logged foods, preferences, and health goals.

8. **Responsive Design:**
   - Fully optimized for both mobile and desktop.
   - Single column, clean UI, easy navigation and logging.

9. **PWA Features:**
   - Installable web app for Android/iOS/desktop.
   - Offline support for all features (food logs, goals, weight tracking).
   - Push notifications for meal reminders.

10. **Data Privacy & Security:**
    - All data handled locally (no cloud storage).
    - Files encrypted or formatted for privacy on export.

11. **Export/Import Data:**
    - Users can export/import nutrition, weight, and profile data as files (CSV/JSON) for easy backup and transfer.

**Azure OpenAI GPT-4o Model Focus:**
- All intelligent features (food search, nutrient info, recipe suggestions, dietary insights for goals) powered by Azure OpenAI GPT-4o, **pre-prompted for Indian cuisine**.
- GPT handles fuzzy matches, regional foods, and personalization for Indian diets.

**App Tagline:**  
“FitPal: Track Indian meals, food intake, and weight—smartly and privately, across any device.”

**Tech Stack:**  
- Front-end: **React** (single-page)
- Storage: **Local file-based** (IndexedDB/localStorage/Downloadable files)
- PWA: **Workbox** for offline, notifications, installability
- Design: **Simple, attractive, easy-to-use, accessibility focused**
