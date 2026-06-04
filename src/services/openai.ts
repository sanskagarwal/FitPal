import OpenAI, { AzureOpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { Food, NutrientInfo, Recipe } from '../types';

// Azure OpenAI Configuration
// Users set these in their environment (.env). Note: in a browser build the key
// is shipped to the client, so use a key scoped/proxied appropriately for prod.
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
const AZURE_OPENAI_API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
// Kept as an alias so existing `messages: OpenAIMessage[]` annotations still compile.
type OpenAIMessage = ChatMessage;

const SYSTEM_PROMPT = `You are FitPal, an expert nutritionist specializing in Indian cuisine. You help users track their nutrition by providing accurate nutritional information about Indian foods and meals. 

Key responsibilities:
1. Identify Indian foods even with misspellings or incomplete entries
2. Provide detailed macro and micronutrient analysis
3. Suggest similar Indian foods and alternatives
4. Recommend healthy Indian recipes
5. Give personalized dietary insights for weight management and fitness goals

Be culturally accurate and focus on Indian meals, ingredients, and cooking methods.`;

// Lazily-created Azure OpenAI client. `dangerouslyAllowBrowser` is required because
// this app calls the API directly from the browser (same posture as the previous fetch).
let azureClient: AzureOpenAI | null = null;
function getClient(): AzureOpenAI {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    throw new Error('Azure OpenAI credentials not configured. Please set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_KEY in your .env file.');
  }
  if (!azureClient) {
    azureClient = new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_KEY,
      apiVersion: AZURE_OPENAI_API_VERSION,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      dangerouslyAllowBrowser: true,
    });
  }
  return azureClient;
}

// Free-form text completion (for non-JSON responses).
async function completeText(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: AZURE_OPENAI_DEPLOYMENT,
    messages,
    temperature,
    max_tokens: 2000,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

// Structured completion using OpenAI structured outputs (strict JSON schema from zod).
async function completeStructured<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  schemaName: string,
  temperature = 0.7
): Promise<T> {
  const completion = await getClient().chat.completions.parse({
    model: AZURE_OPENAI_DEPLOYMENT,
    messages,
    temperature,
    response_format: zodResponseFormat(schema, schemaName),
  });
  const parsed = completion.choices[0]?.message?.parsed;
  if (parsed == null) {
    throw new Error('Model did not return a structured response.');
  }
  return parsed;
}

// Shared nutrient schema. Values correspond to the stated portion. All fields are
// required (structured outputs strict mode); the model fills 0 when not applicable.
const NutrientsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  fiber: z.number(),
  sugar: z.number(),
  sodium: z.number(),
  vitaminA: z.number(),
  vitaminC: z.number(),
  vitaminD: z.number(),
  calcium: z.number(),
  iron: z.number(),
  magnesium: z.number(),
  potassium: z.number(),
});

const FoodAnalysisSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      servingSize: z.string(),
      isIndian: z.boolean(),
      category: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      nutrients: NutrientsSchema,
    })
  ),
});

export async function analyzeFoodWithAI(foodQuery: string): Promise<Food[]> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze this Indian food query: "${foodQuery}" and return up to 3 likely matching foods.

For each food, set "servingSize" using the unit Indians naturally use, including an approximate gram/ml weight in parentheses:
- "katori" for dal, sabzi, curry, rice, kheer (e.g., "1 katori (~150g)")
- "piece" for roti, chapati, idli, samosa, paratha, dosa (e.g., "1 piece (~40g)")
- "glass" for milk, lassi, juice (e.g., "1 glass (~250ml)")
- "bowl"/"plate" for larger portions, "tbsp"/"tsp" for ghee, chutney, pickle

"category" should be one of breakfast/lunch/dinner/snack. The "nutrients" MUST correspond to exactly ONE of that serving unit. Set "confidence" to how sure you are about the nutrition values: "high" for well-known dishes with reliable, standard nutrition; "medium" when you can reasonably estimate; "low" when the food is unusual, ambiguous, or you are largely guessing. If the query is misspelled or incomplete, suggest the most likely Indian foods.`,
    },
  ];

  try {
    const { foods } = await completeStructured(messages, FoodAnalysisSchema, 'food_analysis', 0.2);
    return foods.map((food) => ({
      id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: food.name,
      servingSize: food.servingSize,
      isIndian: food.isIndian ?? true,
      category: food.category,
      confidence: food.confidence,
      nutrients: food.nutrients as NutrientInfo,
    }));
  } catch (error) {
    console.error('Error analyzing food:', error);
    // Throw the error to show it to the user
    throw error;
  }
}

// Re-estimate per-unit nutrition for a known food when the user changes its unit
// (e.g. "bowl" -> "gram" -> "piece"). Returns nutrients for exactly ONE of the new unit.
const ReestimateSchema = z.object({
  servingSize: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  nutrients: NutrientsSchema,
});

export async function reestimateNutrientsForUnit(
  foodName: string,
  unit: string
): Promise<{ servingSize: string; confidence: 'high' | 'medium' | 'low'; nutrients: NutrientInfo }> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `For the Indian food "${foodName}", estimate the nutrition for exactly ONE "${unit}" of it.

"servingSize" must describe one ${unit} with an approximate gram/ml weight in parentheses (e.g. "1 ${unit} (~150g)"). The "nutrients" MUST correspond to exactly ONE ${unit}, not any other portion. Set "confidence" to "high" for well-known dishes with reliable nutrition, "medium" when you can reasonably estimate, or "low" when you are largely guessing.`,
    },
  ];

  const result = await completeStructured(messages, ReestimateSchema, 'reestimate_unit', 0.2);
  return {
    servingSize: result.servingSize,
    confidence: result.confidence,
    nutrients: result.nutrients as NutrientInfo,
  };
}

const RecipesSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      ingredients: z.array(z.string()),
      instructions: z.array(z.string()),
      prepTime: z.string(),
      servings: z.number(),
      nutrients: z.object({
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fats: z.number(),
      }),
    })
  ),
});

export async function getRecipeSuggestions(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: string
): Promise<Recipe[]> {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === 'vegetarian'
          ? 'Only suggest pure vegetarian recipes (no meat, fish, or eggs).'
          : dietPreference === 'eggetarian'
          ? 'Vegetarian recipes plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian recipes are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest 3 healthy Indian recipes based on:
Preferences: ${preferences}
Goals: ${goals}
Recent foods: ${recentFoods.join(', ')}${dietLine}`,
    },
  ];

  try {
    const { recipes } = await completeStructured(messages, RecipesSchema, 'recipe_suggestions', 0.5);
    return recipes.map((recipe) => ({
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      nutrients: recipe.nutrients as NutrientInfo,
    }));
  } catch (error) {
    console.error('Error getting recipes:', error);
    // Throw the error to show it to the user
    throw error;
  }
}

export async function getDietaryInsights(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string
): Promise<string> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Provide dietary insights for an Indian diet:
Current weight: ${currentWeight}kg
Target weight: ${targetWeight}kg
Recent daily average nutrition: ${JSON.stringify(recentNutrition)}
Goals: ${goals}

Give 3-5 specific, actionable recommendations for achieving their goals through Indian cuisine.`,
    },
  ];

  try {
    return await completeText(messages);
  } catch (error) {
    console.error('Error getting insights:', error);
    return 'Focus on portion control and include more protein-rich foods like dal, paneer, and yogurt. Stay hydrated and maintain regular meal times.';
  }
}

export interface MealSuggestion {
  name: string;
  description: string;
  mealType: string;
  ingredients: { item: string; portion: string }[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number; fiber: number };
  reason: string;
}

export interface NutrientFoodItem {
  name: string;
  content: string;
  portion: string;
}

export interface NutrientSuggestion {
  nutrient: string;
  foods: NutrientFoodItem[];
  tips: string[];
}

const MealSuggestionSchema = z.object({
  name: z.string(),
  description: z.string(),
  ingredients: z.array(z.object({ item: z.string(), portion: z.string() })),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
    fiber: z.number(),
  }),
  reason: z.string(),
});

export async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  dietPreference?: string
): Promise<MealSuggestion> {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === 'vegetarian'
          ? 'Only suggest pure vegetarian foods (no meat, fish, or eggs).'
          : dietPreference === 'eggetarian'
          ? 'Vegetarian foods plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian foods are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest a single Indian ${mealType} meal to help meet these remaining daily targets:
Calories: ${remainingCalories} kcal
Protein: ${remainingProtein}g
Carbs: ${remainingCarbs}g
Fats: ${remainingFats}g
Fiber: ${remainingFiber}g${dietLine}

Use common, easily available Indian foods. Keep portions realistic (katori, piece, glass, tbsp, etc.). All nutrition numbers must be the totals for the whole meal.`,
    },
  ];

  try {
    const parsed = await completeStructured(messages, MealSuggestionSchema, 'meal_suggestion', 0.5);
    return {
      name: parsed.name || `${mealType} suggestion`,
      description: parsed.description || '',
      mealType,
      ingredients: parsed.ingredients
        .map((i) => ({ item: String(i.item || ''), portion: String(i.portion || '') }))
        .filter((i) => i.item),
      nutrition: {
        calories: Math.round(parsed.nutrition.calories || 0),
        protein: Math.round(parsed.nutrition.protein || 0),
        carbs: Math.round(parsed.nutrition.carbs || 0),
        fats: Math.round(parsed.nutrition.fats || 0),
        fiber: Math.round(parsed.nutrition.fiber || 0),
      },
      reason: parsed.reason || '',
    };
  } catch (error) {
    console.error('Error getting meal suggestion:', error);
    return {
      name: 'Balanced Indian plate',
      description: 'A simple, balanced meal using everyday Indian foods.',
      mealType,
      ingredients: [
        { item: 'Dal (lentils)', portion: '1 katori' },
        { item: 'Roti or rice', portion: '2 pieces / 1 katori' },
        { item: 'Mixed vegetable sabzi', portion: '1 katori' },
        { item: 'Curd', portion: '1 katori' },
      ],
      nutrition: {
        calories: Math.max(0, Math.round(remainingCalories)),
        protein: Math.max(0, Math.round(remainingProtein)),
        carbs: Math.max(0, Math.round(remainingCarbs)),
        fats: Math.max(0, Math.round(remainingFats)),
        fiber: Math.max(0, Math.round(remainingFiber)),
      },
      reason: 'Balances protein, carbs, fibre and a little healthy fat to fill your remaining goals.',
    };
  }
}

const NutrientSuggestionSchema = z.object({
  foods: z.array(z.object({ name: z.string(), content: z.string(), portion: z.string() })),
  tips: z.array(z.string()),
});

export async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
): Promise<NutrientSuggestion> {
  const deficit = targetAmount - currentAmount;
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Suggest Indian foods rich in ${nutrientName}.

Current: ${Math.round(currentAmount)}
Target: ${Math.round(targetAmount)}
Need: ${Math.round(deficit)} more

Provide 3-5 commonly available Indian foods high in ${nutrientName}. For each, "content" is the amount of ${nutrientName} per portion (e.g. "12g") and "portion" is a realistic serving (e.g. "1 katori"). Also give 2-3 short, practical tips for adding these foods to meals.`,
    },
  ];

  try {
    const parsed = await completeStructured(messages, NutrientSuggestionSchema, 'nutrient_suggestion', 0.3);
    return {
      nutrient: nutrientName,
      foods: parsed.foods
        .map((f) => ({ name: String(f.name || ''), content: String(f.content || ''), portion: String(f.portion || '') }))
        .filter((f) => f.name),
      tips: parsed.tips.map((t) => String(t)).filter(Boolean),
    };
  } catch (error) {
    console.error('Error getting food suggestion:', error);
    return {
      nutrient: nutrientName,
      foods: [],
      tips: [
        `Include more ${nutrientName}-rich foods such as dairy, pulses, vegetables and whole grains.`,
      ],
    };
  }
}

const GoalsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  fiber: z.number(),
  explanation: z.string(),
});

export async function suggestGoals(
  height: number,
  currentWeight: number,
  age: number,
  gender: string,
  activityLevel: string,
  targetWeight: number
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  explanation: string;
}> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Calculate recommended daily nutrition goals for:
Height: ${height}cm
Current Weight: ${currentWeight}kg
Age: ${age}
Gender: ${gender}
Activity Level: ${activityLevel}
Target Weight: ${targetWeight}kg
Goal direction: ${
        targetWeight < currentWeight
          ? 'weight loss (apply a moderate calorie deficit)'
          : targetWeight > currentWeight
          ? 'weight gain (apply a moderate calorie surplus)'
          : 'weight maintenance (no deficit or surplus)'
      }

First compute maintenance calories (TDEE) using a standard BMR formula (Mifflin-St Jeor or Harris-Benedict) times an activity factor. Then adjust the calorie target toward the target weight: apply a safe deficit of about 300-500 kcal/day for weight loss, or a surplus of about 250-500 kcal/day for weight gain, and no adjustment for maintenance. Never recommend fewer than 1200 kcal/day for women or 1500 kcal/day for men. Keep protein high enough to preserve muscle during a deficit, and use macronutrient ratios appropriate for an Indian diet. In the explanation, state the maintenance calories, the deficit/surplus applied, and why.`,
    },
  ];

  try {
    return await completeStructured(messages, GoalsSchema, 'nutrition_goals', 0.3);
  } catch (error) {
    console.error('Error getting goal suggestions:', error);
    // Return basic calculations as fallback
    const bmr = gender === 'male' 
      ? 10 * currentWeight + 6.25 * height - 5 * age + 5
      : 10 * currentWeight + 6.25 * height - 5 * age - 161;
    
    const activityMultiplier = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very-active': 1.9
    }[activityLevel] || 1.5;

    const maintenanceCalories = Math.round(bmr * activityMultiplier);

    // Adjust toward target weight with a safe deficit/surplus.
    let calories = maintenanceCalories;
    let adjustmentNote = 'no adjustment (maintenance)';
    if (targetWeight < currentWeight) {
      calories = maintenanceCalories - 500; // ~0.5 kg/week loss
      adjustmentNote = 'a 500 kcal/day deficit for weight loss';
    } else if (targetWeight > currentWeight) {
      calories = maintenanceCalories + 300; // lean gain
      adjustmentNote = 'a 300 kcal/day surplus for weight gain';
    }

    // Enforce a safe minimum floor.
    const minCalories = gender === 'male' ? 1500 : 1200;
    calories = Math.max(minCalories, calories);

    const protein = Math.round(currentWeight * 1.6);
    const fats = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fats * 9)) / 4);
    const fiber = 30;

    return {
      calories,
      protein,
      carbs,
      fats,
      fiber,
      explanation: `Maintenance is about ${maintenanceCalories} kcal/day (BMR × activity). Applied ${adjustmentNote} to move toward your target weight of ${targetWeight}kg.`
    };
  }
}

// ---------------------------------------------------------------------------
// Agentic, conversational meal logging
// ---------------------------------------------------------------------------

export interface ParsedMealFood {
  name: string;
  servingSize: string; // describes ONE unit, e.g. "1 katori (~150g)"
  unit:
    | 'serving'
    | 'katori'
    | 'bowl'
    | 'plate'
    | 'cup'
    | 'glass'
    | 'tbsp'
    | 'tsp'
    | 'piece'
    | 'slice'
    | 'gram'
    | 'ml'
    | 'oz';
  unitQuantity: number; // how many of `unit` the user had
  isIndian: boolean;
  category?: string;
  confidence?: 'high' | 'medium' | 'low'; // how sure the model is about the nutrition
  nutrients: NutrientInfo; // per ONE unit
}

// What the assistant wants to do with the meal it has understood.
export type MealChatAction = 'log' | 'update' | 'delete';

export interface MealChatResult {
  status: 'need_info' | 'ready';
  action: MealChatAction; // log a new meal, edit an existing one, or delete one
  targetMealId?: string | null; // id of the existing meal for update/delete
  message: string; // assistant's reply: a clarifying question or a confirmation summary
  mealType?: 'breakfast' | 'morning-snack' | 'lunch' | 'evening-snack' | 'dinner';
  time?: string | null; // HH:mm if known
  foods: ParsedMealFood[];
}

// Compact summary of an already-logged meal, given to the assistant so it can
// reference, edit or delete existing meals by id.
export interface LoggedMealSummary {
  id: string;
  mealType: string;
  time?: string | null; // HH:mm if known
  foods: { name: string; unitQuantity: number; unit: string }[];
}

const MEAL_CHAT_SYSTEM_PROMPT = `You are FitPal's agentic meal-logging assistant, an expert nutritionist specializing in Indian cuisine.

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
4. CRITICAL — the "nutrients" object MUST be for exactly ONE single unit of the food, NEVER for the total amount the user ate. The app multiplies these per-unit values by "unitQuantity" itself, so if you pre-multiply you will DOUBLE-COUNT. Set unitQuantity to how many units the user had, and keep nutrients for just one unit.
5. Keep every nutrient realistic for a typical Indian home portion of ONE unit. Base estimates on the food's actual ingredients and standard portion weight, and stay within plausible ranges for that dish. Do not overstate calories, protein, carbs, fats or any micronutrient — when unsure, prefer a sensible mid-range value over an extreme one.
6. Set "confidence" per food to how sure you are about its nutrition values: "high" for well-known dishes with reliable, standard nutrition; "medium" when you can reasonably estimate; "low" when the food is unusual, ambiguous, or you are largely guessing. Being honest with a "low" lets the user correct the calories.

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
      "category": "lunch",
      "confidence": "high" | "medium" | "low",
      "nutrients": {
        "calories": number, "protein": number, "carbs": number, "fats": number,
        "fiber": number, "sugar": number, "sodium": number,
        "vitaminA": number, "vitaminC": number, "vitaminD": number,
        "calcium": number, "iron": number, "magnesium": number, "potassium": number
      }
    }
  ]
}

For "delete", "foods" must be an empty array. For "update", "foods" must contain the full corrected list of foods for that meal. When status is "need_info", you may still include any foods you have already understood (with your best-guess quantities) so the user sees progress, but set status to "need_info" until the open question is resolved. When everything needed is known, set status to "ready".`;

const MEAL_UNITS = [
  'serving', 'katori', 'bowl', 'plate', 'cup', 'glass', 'tbsp', 'tsp', 'piece', 'slice', 'gram', 'ml', 'oz',
] as const;
const MEAL_TYPES = ['breakfast', 'morning-snack', 'lunch', 'evening-snack', 'dinner'] as const;

const MealChatSchema = z.object({
  status: z.enum(['need_info', 'ready']),
  action: z.enum(['log', 'update', 'delete']),
  targetMealId: z.string().nullable(),
  message: z.string(),
  mealType: z.enum(MEAL_TYPES).nullable(),
  time: z.string().nullable(),
  foods: z.array(
    z.object({
      name: z.string(),
      servingSize: z.string(),
      unit: z.enum(MEAL_UNITS),
      unitQuantity: z.number(),
      isIndian: z.boolean(),
      category: z.string().nullable(),
      confidence: z.enum(['high', 'medium', 'low']),
      nutrients: NutrientsSchema,
    })
  ),
});

export async function chatLogMeal(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[] = []
): Promise<MealChatResult> {
  const now = new Date();
  const mealsContext =
    loggedMeals.length > 0
      ? `Meals already logged today (you may update or delete these by their id):\n${JSON.stringify(loggedMeals)}`
      : 'No meals are logged yet today. The user can only "log" new meals right now.';
  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEAL_CHAT_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Current local time is ${now.toLocaleString()}. Use this to infer meal type/time when the user does not specify it.`,
    },
    { role: 'system', content: mealsContext },
    ...history,
  ];

  const parsed = await completeStructured(messages, MealChatSchema, 'meal_chat', 0.2);

  return {
    status: parsed.status,
    action: parsed.action,
    targetMealId: parsed.targetMealId ?? null,
    message: parsed.message || '',
    mealType: parsed.mealType ?? undefined,
    time: parsed.time ?? null,
    foods: parsed.foods.map((f) => ({
      name: f.name,
      servingSize: f.servingSize,
      unit: f.unit,
      unitQuantity: f.unitQuantity,
      isIndian: f.isIndian,
      category: f.category ?? undefined,
      confidence: f.confidence,
      nutrients: f.nutrients as NutrientInfo,
    })),
  };
}
