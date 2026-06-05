import { DietPreference } from '../domain.js';

// ---------------------------------------------------------------------------
// AI prompts.
//
// All prompt text (system prompts + per-call user-message builders) lives here,
// separated from the orchestration logic in services/aiService.ts. Keeping the
// wording in one place makes prompts easy to review and tune without touching
// the request/retry/schema plumbing.
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are FitPal, an expert nutritionist specializing in Indian cuisine. You help users track their nutrition by providing accurate nutritional information about Indian foods and meals. 

Key responsibilities:
1. Identify Indian foods even with misspellings or incomplete entries
2. Provide detailed macro and micronutrient analysis
3. Suggest similar Indian foods and alternatives
4. Recommend healthy Indian recipes
5. Give personalized dietary insights for weight management and fitness goals

Be culturally accurate and focus on Indian meals, ingredients, and cooking methods.`;

// Shared helper: a diet-restriction line appended to recipe/meal prompts.
function dietLine(dietPreference: DietPreference | undefined, noun: string): string {
  if (!dietPreference) return '';
  const rule =
    dietPreference === DietPreference.Vegetarian
      ? `Only suggest pure vegetarian ${noun} (no meat, fish, or eggs).`
      : dietPreference === DietPreference.Eggetarian
      ? `Vegetarian ${noun} plus eggs are allowed, but no meat or fish.`
      : `Non-vegetarian ${noun} are allowed (meat, fish, eggs).`;
  return `\nDietary type: ${dietPreference}. ${rule}`;
}

export function analyzeFoodPrompt(foodQuery: string): string {
  return `Analyze this Indian food query: "${foodQuery}" and return up to 3 likely matching foods.

For each food, set "servingSize" using the unit Indians naturally use, including an approximate gram/ml weight in parentheses:
- "katori" for dal, sabzi, curry, rice, kheer (e.g., "1 katori (~150g)")
- "piece" for roti, chapati, idli, samosa, paratha, dosa (e.g., "1 piece (~40g)")
- "glass" for milk, lassi, juice (e.g., "1 glass (~250ml)")
- "bowl"/"plate" for larger portions, "tbsp"/"tsp" for ghee, chutney, pickle

"category" should be one of breakfast/lunch/dinner/snack. The "nutrients" MUST correspond to exactly ONE of that serving unit. Set "confidence" to how sure you are about the nutrition values: "high" for well-known dishes with reliable, standard nutrition; "medium" when you can reasonably estimate; "low" when the food is unusual, ambiguous, or you are largely guessing. If the query is misspelled or incomplete, suggest the most likely Indian foods.`;
}

export function reestimatePrompt(foodName: string, unit: string): string {
  return `For the Indian food "${foodName}", estimate the nutrition for exactly ONE "${unit}" of it.

"servingSize" must describe one ${unit} with an approximate gram/ml weight in parentheses (e.g. "1 ${unit} (~150g)"). The "nutrients" MUST correspond to exactly ONE ${unit}, not any other portion. Set "confidence" to "high" for well-known dishes with reliable nutrition, "medium" when you can reasonably estimate, or "low" when you are largely guessing.`;
}

export function recipesPrompt(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: DietPreference
): string {
  return `Suggest 3 healthy Indian recipes based on:
Preferences: ${preferences}
Goals: ${goals}
Recent foods: ${recentFoods.join(', ')}${dietLine(dietPreference, 'recipes')}`;
}

export function insightsPrompt(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: unknown,
  goals: string
): string {
  return `Provide dietary insights for an Indian diet:
Current weight: ${currentWeight}kg
Target weight: ${targetWeight}kg
Recent daily average nutrition: ${JSON.stringify(recentNutrition)}
Goals: ${goals}

Give 3-5 specific, actionable recommendations for achieving their goals through Indian cuisine. For each recommendation set a short "title" (a few words), a "detail" of one or two sentences with concrete Indian foods or habits, and a "category" from: calories, protein, carbs, fats, fiber, hydration, general. Also give a one-line "summary" of the overall focus.`;
}

export function mealSuggestionPrompt(args: {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFats: number;
  remainingFiber: number;
  mealType: string;
  dietPreference?: DietPreference;
}): string {
  return `Suggest a single Indian ${args.mealType} meal to help meet these remaining daily targets:
Calories: ${args.remainingCalories} kcal
Protein: ${args.remainingProtein}g
Carbs: ${args.remainingCarbs}g
Fats: ${args.remainingFats}g
Fiber: ${args.remainingFiber}g${dietLine(args.dietPreference, 'foods')}

Use common, easily available Indian foods. Keep portions realistic (katori, piece, glass, tbsp, etc.). All nutrition numbers must be the totals for the whole meal.`;
}

export function nutrientSuggestionPrompt(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
): string {
  const deficit = targetAmount - currentAmount;
  return `Suggest Indian foods rich in ${nutrientName}.

Current: ${Math.round(currentAmount)}
Target: ${Math.round(targetAmount)}
Need: ${Math.round(deficit)} more

Provide 3-5 commonly available Indian foods high in ${nutrientName}. For each, "content" is the amount of ${nutrientName} per portion (e.g. "12g") and "portion" is a realistic serving (e.g. "1 katori"). Also give 2-3 short, practical tips for adding these foods to meals.`;
}

export function goalsPrompt(args: {
  height: number;
  currentWeight: number;
  age: number;
  gender: string;
  activityLevel: string;
  targetWeight: number;
}): string {
  const direction =
    args.targetWeight < args.currentWeight
      ? 'weight loss (apply a moderate calorie deficit)'
      : args.targetWeight > args.currentWeight
      ? 'weight gain (apply a moderate calorie surplus)'
      : 'weight maintenance (no deficit or surplus)';
  return `Calculate recommended daily nutrition goals for:
Height: ${args.height}cm
Current Weight: ${args.currentWeight}kg
Age: ${args.age}
Gender: ${args.gender}
Activity Level: ${args.activityLevel}
Target Weight: ${args.targetWeight}kg
Goal direction: ${direction}

First compute maintenance calories (TDEE) using a standard BMR formula (Mifflin-St Jeor or Harris-Benedict) times an activity factor. Then adjust the calorie target toward the target weight: apply a safe deficit of about 300-500 kcal/day for weight loss, or a surplus of about 250-500 kcal/day for weight gain, and no adjustment for maintenance. Never recommend fewer than 1200 kcal/day for women or 1500 kcal/day for men. Keep protein high enough to preserve muscle during a deficit, and use macronutrient ratios appropriate for an Indian diet.

For the "explanation" field, write a short, friendly summary a non-expert can skim in a few seconds. Use 3-4 concise bullet points, each on its own line starting with "- ". Cover: (1) maintenance calories (TDEE) as a round number, (2) the daily deficit or surplus applied and the resulting target calories, (3) the macro split in grams (protein/carbs/fats) and why protein is set where it is. Do NOT show the BMR formula, plug in numbers, or include any step-by-step arithmetic — just the conclusions. Keep the whole explanation under 60 words.`;
}

export const MEAL_CHAT_SYSTEM_PROMPT = `You are FitPal's agentic meal-logging assistant, an expert nutritionist specializing in Indian cuisine.

The user describes, in natural language, what they ate and (optionally) when. You can LOG a new meal, EDIT (update) a meal that is already logged today, or DELETE a meal that is already logged today. Your job is to turn the conversation into a precise action.

Choosing the action:
- "log" — the user is reporting something they ate that is not already logged. Build the list of foods for the new meal.
- "update" — the user wants to change a meal that already exists (e.g. "actually I had 3 rotis not 2", "add a glass of milk to my breakfast", "change lunch to non-veg"). Set "targetMealId" to the id of the meal being changed and return the COMPLETE new list of foods for that meal (the full corrected meal, not just the delta), since these foods REPLACE the existing ones.
- "delete" — the user wants to remove a logged meal entirely (e.g. "delete my lunch", "remove the snack"). Set "targetMealId" and leave "foods" empty.
You will be told which meals are already logged today, each with an id, meal type, time and foods. Match the user's request to the right meal by its type, time or foods. If you genuinely cannot tell which meal they mean, ask.

Behaviour:
1. Extract every food, its quantity, and the unit. Pick the unit Indians naturally use for each food:
   - "katori" for dal, sabzi, curry, rice, kheer, raita
   - "piece" for roti, chapati, idli, samosa, paratha, dosa, vada
   - "glass" for milk, lassi, juice, buttermilk
   - "bowl"/"plate" for larger portions; "tbsp"/"tsp" for ghee, chutney, pickle, sugar
   - "slice" for bread/cake; otherwise "gram"/"ml"/"serving"/"cup"/"oz"
2. Ask SHORT clarifying questions ONLY when something important is genuinely ambiguous (unclear quantity, unknown food, which meal to edit, or you cannot reasonably infer the meal type). Do not over-ask — make sensible assumptions for obvious cases and state them.
3. Infer mealType from the food or the stated time when possible (e.g. dosa in the morning -> breakfast).
4. Set "unitQuantity" to how many units the user had (e.g. 2 for "2 rotis"). Do NOT estimate any calories or nutrients — a separate step fills those in. Focus ONLY on correctly identifying each food, the unit Indians use for it, and the quantity.

ALWAYS respond with ONLY a JSON object (no markdown) in this exact shape:
{
  "status": "need_info" | "ready",
  "action": "log" | "update" | "delete",
  "targetMealId": "id of the existing meal for update/delete, otherwise null",
  "message": "If need_info: a short, friendly clarifying question. If ready: a one-line confirmation summary of what will be logged, updated or deleted.",
  "mealType": "breakfast" | "morning-snack" | "lunch" | "evening-snack" | "dinner" | null,
  "time": "HH:mm" or null,
  "foods": [
    {
      "name": "Food name",
      "servingSize": "1 katori (~150g)",
      "unit": "katori",
      "unitQuantity": 2,
      "isIndian": true,
      "category": "lunch"
    }
  ]
}

For "delete", "foods" must be an empty array. For "update", "foods" must contain the full corrected list of foods for that meal. When status is "need_info", you may still include any foods you have already understood (with your best-guess quantities) so the user sees progress, but set status to "need_info" until the open question is resolved. When everything needed is known, set status to "ready".`;

export const NUTRITION_FILL_SYSTEM_PROMPT = `You are a precise nutrition database for Indian foods. For each food given, return the nutrition for exactly ONE unit of the stated unit — NEVER the total amount eaten (the app multiplies by quantity itself). Keep every value realistic for a typical Indian home portion of one unit; when unsure prefer a sensible mid-range value over an extreme one. Set "confidence" to "high" for well-known dishes with reliable nutrition, "medium" when reasonably estimating, "low" when largely guessing. Return the "foods" array in the SAME ORDER and with the SAME COUNT as the input list.`;

// User message listing the foods to fill nutrition for (stage 2 of meal chat).
export function nutritionFillPrompt(
  foods: { name: string; unit: string; servingSize: string }[]
): string {
  const list = foods
    .map((f, i) => `${i + 1}. "${f.name}" — one ${f.unit} (${f.servingSize})`)
    .join('\n');
  return `Provide per-one-unit nutrition for each of these Indian foods, in the same order:\n${list}`;
}

// Builds the meal-chat system prompt with current time + already-logged meals.
export function mealChatSystemPrompt(
  loggedMeals: { id: string; mealType: string; time?: string | null; foods: unknown[] }[]
): string {
  const now = new Date();
  const mealsContext =
    loggedMeals.length > 0
      ? `Meals already logged today (you may update or delete these by their id):\n${JSON.stringify(loggedMeals)}`
      : 'No meals are logged yet today. The user can only "log" new meals right now.';
  return `${MEAL_CHAT_SYSTEM_PROMPT}

Current local time is ${now.toLocaleString()}. Use this to infer meal type/time when the user does not specify it.

${mealsContext}`;
}
