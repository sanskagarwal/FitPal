import { Router, Request, Response } from 'express';
import { generateText, streamText, Output, type LanguageModel, type ModelMessage } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { getCachedNutrition, putCachedNutrition } from './storage.js';
import {
  DietPreference,
  Gender,
  ActivityLevel,
  MealType,
  MealUnit,
  NutrientsSchema,
  type NutrientInfo,
} from './domain.js';

interface Food {
  id: string;
  name: string;
  servingSize: string;
  nutrients: NutrientInfo;
  isIndian: boolean;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
}
interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  servings: number;
  nutrients: NutrientInfo;
}

const SYSTEM_PROMPT = `You are FitPal, an expert nutritionist specializing in Indian cuisine. You help users track their nutrition by providing accurate nutritional information about Indian foods and meals. 

Key responsibilities:
1. Identify Indian foods even with misspellings or incomplete entries
2. Provide detailed macro and micronutrient analysis
3. Suggest similar Indian foods and alternatives
4. Recommend healthy Indian recipes
5. Give personalized dietary insights for weight management and fitness goals

Be culturally accurate and focus on Indian meals, ingredients, and cooking methods.`;

type ChatMessage = ModelMessage;

// Lazily-created language model, configured entirely from generic env vars via
// the Vercel AI SDK. Required: AI_API_KEY, AI_BASE_URL, AI_MODEL. AI_PROVIDER
// selects the SDK: 'openai-compatible' (default) treats the endpoint as an
// OpenAI-compatible API (OpenAI, LiteLLM, OpenRouter, Ollama, vLLM, …); 'azure'
// uses the Azure OpenAI SDK, where AI_BASE_URL is the resource endpoint and
// AI_MODEL is the deployment name. Nothing is inferred — missing config throws.
let aiModel: LanguageModel | null = null;
function getModel(): LanguageModel {
  if (aiModel) return aiModel;

  const apiKey = requireEnv('AI_API_KEY');
  const baseURL = requireEnv('AI_BASE_URL');
  const model = requireEnv('AI_MODEL');
  const provider = (process.env.AI_PROVIDER || 'openai-compatible').toLowerCase();

  switch (provider) {
    case 'openai-compatible':
      aiModel = createOpenAICompatible({ name: 'fitpal-ai', baseURL, apiKey })(model);
      break;
    case 'azure':
      aiModel = createAzure({
        baseURL: `${baseURL.replace(/\/+$/, '')}/openai`,
        apiKey,
        apiVersion: requireEnv('AI_API_VERSION'),
        useDeploymentBasedUrls: true,
      }).chat(model);
      break;
    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Use "openai-compatible" (default) or "azure".`
      );
  }
  return aiModel;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

// Whether a failed AI call is worth retrying. Transient issues (network blips,
// rate limits, upstream 5xx) and schema/parse failures often succeed on a
// second attempt; configuration and auth errors will not, so we fail fast.
function isRetryableError(error: unknown): boolean {
  const status =
    (error as { statusCode?: number; status?: number })?.statusCode ??
    (error as { status?: number })?.status;
  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500) return true;
    if (status >= 400) return false; // auth/validation/bad-request: don't retry
  }
  const name = (error as { name?: string })?.name ?? '';
  const message = ((error as { message?: string })?.message ?? '').toLowerCase();
  // AI SDK throws these when the model returns malformed/invalid JSON.
  if (name.includes('NoObjectGenerated') || name.includes('JSONParse')) return true;
  if (name.includes('TypeValidation')) return true;
  // Generic network failures surfaced by fetch/undici.
  return /network|timeout|timed out|econnreset|econnrefused|fetch failed|socket hang up/.test(
    message
  );
}

// Run an AI call with a few exponential-backoff retries on transient failures.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryableError(error)) break;
      const delayMs = 300 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      console.warn(
        `AI call failed (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms:`,
        (error as { message?: string })?.message || error
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Free-form text completion (for non-JSON responses).
async function completeText(
  messages: ChatMessage[],
  temperature = 0.7,
  system = SYSTEM_PROMPT
): Promise<string> {
  const { text } = await withRetry(() =>
    generateText({
      model: getModel(),
      system,
      messages,
      temperature,
      maxOutputTokens: 2000,
    })
  );
  return text.trim();
}

// Structured completion. The AI SDK picks the right strategy (native JSON
// schema, JSON mode or tool calling) for the configured model and validates the
// result against the zod schema.
async function completeStructured<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  schemaName: string,
  temperature = 0.7,
  system = SYSTEM_PROMPT
): Promise<T> {
  const { output } = await withRetry(() =>
    generateText({
      model: getModel(),
      system,
      messages,
      temperature,
      output: Output.object({ schema, name: schemaName }),
    })
  );
  return output;
}

// ---------------------------------------------------------------------------
// Food analysis
// ---------------------------------------------------------------------------
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

async function analyzeFoodWithAI(foodQuery: string): Promise<Food[]> {
  const messages: ChatMessage[] = [
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
}

// ---------------------------------------------------------------------------
// Re-estimate per-unit nutrition
// ---------------------------------------------------------------------------
const ReestimateSchema = z.object({
  servingSize: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  nutrients: NutrientsSchema,
});

async function reestimateNutrientsForUnit(foodName: string, unit: MealUnit) {
  const messages: ChatMessage[] = [
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

// ---------------------------------------------------------------------------
// Recipe suggestions
// ---------------------------------------------------------------------------
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

async function getRecipeSuggestions(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: DietPreference
): Promise<Recipe[]> {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === DietPreference.Vegetarian
          ? 'Only suggest pure vegetarian recipes (no meat, fish, or eggs).'
          : dietPreference === DietPreference.Eggetarian
          ? 'Vegetarian recipes plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian recipes are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: `Suggest 3 healthy Indian recipes based on:
Preferences: ${preferences}
Goals: ${goals}
Recent foods: ${recentFoods.join(', ')}${dietLine}`,
    },
  ];

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
}

// ---------------------------------------------------------------------------
// Dietary insights
// ---------------------------------------------------------------------------
async function getDietaryInsights(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string
): Promise<string> {
  const messages: ChatMessage[] = [
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

// Streaming variant of dietary insights: emits text chunks via `onChunk` as the
// model generates them. Returns the full text. Throws on failure so the caller
// can fall back to the buffered (fallback-bearing) getDietaryInsights.
async function getDietaryInsightsStream(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string,
  onChunk: (text: string) => void
): Promise<string> {
  const messages: ChatMessage[] = [
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

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages,
    temperature: 0.7,
    maxOutputTokens: 2000,
  });

  let full = '';
  for await (const delta of result.textStream) {
    full += delta;
    onChunk(delta);
  }
  return full.trim();
}

// ---------------------------------------------------------------------------
// Meal suggestion
// ---------------------------------------------------------------------------
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

async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  dietPreference?: DietPreference
) {
  const dietLine = dietPreference
    ? `\nDietary type: ${dietPreference}. ${
        dietPreference === DietPreference.Vegetarian
          ? 'Only suggest pure vegetarian foods (no meat, fish, or eggs).'
          : dietPreference === DietPreference.Eggetarian
          ? 'Vegetarian foods plus eggs are allowed, but no meat or fish.'
          : 'Non-vegetarian foods are allowed (meat, fish, eggs).'
      }`
    : '';
  const messages: ChatMessage[] = [
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

// ---------------------------------------------------------------------------
// Nutrient food suggestion
// ---------------------------------------------------------------------------
const NutrientSuggestionSchema = z.object({
  foods: z.array(z.object({ name: z.string(), content: z.string(), portion: z.string() })),
  tips: z.array(z.string()),
});

async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
) {
  const deficit = targetAmount - currentAmount;
  const messages: ChatMessage[] = [
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

// ---------------------------------------------------------------------------
// Goal suggestions
// ---------------------------------------------------------------------------
const GoalsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  fiber: z.number(),
  explanation: z.string(),
});

async function suggestGoals(
  height: number,
  currentWeight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  targetWeight: number
) {
  const messages: ChatMessage[] = [
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

First compute maintenance calories (TDEE) using a standard BMR formula (Mifflin-St Jeor or Harris-Benedict) times an activity factor. Then adjust the calorie target toward the target weight: apply a safe deficit of about 300-500 kcal/day for weight loss, or a surplus of about 250-500 kcal/day for weight gain, and no adjustment for maintenance. Never recommend fewer than 1200 kcal/day for women or 1500 kcal/day for men. Keep protein high enough to preserve muscle during a deficit, and use macronutrient ratios appropriate for an Indian diet.

For the "explanation" field, write a short, friendly summary a non-expert can skim in a few seconds. Use 3-4 concise bullet points, each on its own line starting with "- ". Cover: (1) maintenance calories (TDEE) as a round number, (2) the daily deficit or surplus applied and the resulting target calories, (3) the macro split in grams (protein/carbs/fats) and why protein is set where it is. Do NOT show the BMR formula, plug in numbers, or include any step-by-step arithmetic — just the conclusions. Keep the whole explanation under 60 words.`,
    },
  ];

  try {
    return await completeStructured(messages, GoalsSchema, 'nutrition_goals', 0.3);
  } catch (error) {
    console.error('Error getting goal suggestions:', error);
    const bmr =
      gender === Gender.Male
        ? 10 * currentWeight + 6.25 * height - 5 * age + 5
        : 10 * currentWeight + 6.25 * height - 5 * age - 161;

    const activityMultiplier =
      ({
        [ActivityLevel.Sedentary]: 1.2,
        [ActivityLevel.Light]: 1.375,
        [ActivityLevel.Moderate]: 1.55,
        [ActivityLevel.Active]: 1.725,
        [ActivityLevel.VeryActive]: 1.9,
      } as Record<string, number>)[activityLevel] || 1.5;

    const maintenanceCalories = Math.round(bmr * activityMultiplier);

    let calories = maintenanceCalories;
    let adjustmentNote = 'no adjustment (maintenance)';
    if (targetWeight < currentWeight) {
      calories = maintenanceCalories - 500;
      adjustmentNote = 'a 500 kcal/day deficit for weight loss';
    } else if (targetWeight > currentWeight) {
      calories = maintenanceCalories + 300;
      adjustmentNote = 'a 300 kcal/day surplus for weight gain';
    }

    const minCalories = gender === Gender.Male ? 1500 : 1200;
    calories = Math.max(minCalories, calories);

    const protein = Math.round(currentWeight * 1.6);
    const fats = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
    const fiber = 30;

    return {
      calories,
      protein,
      carbs,
      fats,
      fiber,
      explanation: `- Maintenance (TDEE): ~${maintenanceCalories} kcal/day\n- Target: ${calories} kcal/day — ${adjustmentNote}\n- Macros: ${protein}g protein, ${carbs}g carbs, ${fats}g fats`,
    };
  }
}

// ---------------------------------------------------------------------------
// Agentic, conversational meal logging
// ---------------------------------------------------------------------------
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

const MealChatSchema = z.object({
  status: z.enum(['need_info', 'ready']),
  action: z.enum(['log', 'update', 'delete']),
  targetMealId: z.string().nullable(),
  message: z.string(),
  mealType: z.enum(MealType).nullable(),
  time: z.string().nullable(),
  foods: z.array(
    z.object({
      name: z.string(),
      servingSize: z.string(),
      unit: z.enum(MealUnit),
      unitQuantity: z.number(),
      isIndian: z.boolean(),
      category: z.string().nullable(),
      confidence: z.enum(['high', 'medium', 'low']),
      nutrients: NutrientsSchema,
    })
  ),
});

interface LoggedMealSummary {
  id: string;
  mealType: string;
  time?: string | null;
  foods: { name: string; unitQuantity: number; unit: string }[];
}

async function chatLogMeal(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[] = []
) {
  const { system, messages } = buildChatPrompt(history, loggedMeals);
  const parsed = await completeStructured(messages, MealChatSchema, 'meal_chat', 0.2, system);
  return groundChatResult(parsed);
}

// Streaming variant: emits the assistant's `message` text via `onMessage` as it
// is generated (the message is an early field in the schema, so it arrives
// before the larger `foods` array), then returns the fully-grounded result.
async function chatLogMealStream(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[],
  onMessage: (text: string) => void
): Promise<ReturnType<typeof groundChatResult>> {
  const { system, messages } = buildChatPrompt(history, loggedMeals);
  const result = streamText({
    model: getModel(),
    system,
    messages,
    temperature: 0.2,
    output: Output.object({ schema: MealChatSchema, name: 'meal_chat' }),
  });

  let lastMessage = '';
  for await (const partial of result.partialOutputStream) {
    if (typeof partial?.message === 'string' && partial.message !== lastMessage) {
      lastMessage = partial.message;
      onMessage(lastMessage);
    }
  }

  const parsed = await result.output;
  return groundChatResult(parsed);
}

// Build the system prompt (with current time + already-logged meals context)
// and message list shared by the streaming and non-streaming chat paths.
function buildChatPrompt(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[]
): { system: string; messages: ChatMessage[] } {
  const now = new Date();
  const mealsContext =
    loggedMeals.length > 0
      ? `Meals already logged today (you may update or delete these by their id):\n${JSON.stringify(loggedMeals)}`
      : 'No meals are logged yet today. The user can only "log" new meals right now.';
  const system = `${MEAL_CHAT_SYSTEM_PROMPT}

Current local time is ${now.toLocaleString()}. Use this to infer meal type/time when the user does not specify it.

${mealsContext}`;
  return { system, messages: [...history] };
}

// Ground a parsed meal result against the nutrition cache. A cache hit overrides
// macros (cached values win) but keeps the model's micronutrient estimates; a
// confident miss is learned for next time so the same food logs consistently.
function groundChatResult(parsed: z.infer<typeof MealChatSchema>) {
  return {
    status: parsed.status,
    action: parsed.action,
    targetMealId: parsed.targetMealId ?? null,
    message: parsed.message || '',
    mealType: parsed.mealType ?? undefined,
    time: parsed.time ?? null,
    foods: parsed.foods.map((f) => {
      const cached = getCachedNutrition(f.name, f.unit);
      let nutrients = f.nutrients as NutrientInfo;
      let servingSize = f.servingSize;
      let confidence = f.confidence;
      if (cached) {
        nutrients = { ...nutrients, ...cached.nutrients };
        if (cached.servingSize) servingSize = cached.servingSize;
        confidence = 'high';
      } else if (f.confidence === 'high') {
        putCachedNutrition(f.name, f.unit, {
          servingSize: f.servingSize,
          nutrients: f.nutrients as Record<string, number>,
        });
      }
      return {
        name: f.name,
        servingSize,
        unit: f.unit,
        unitQuantity: f.unitQuantity,
        isIndian: f.isIndian,
        category: f.category ?? undefined,
        confidence,
        nutrients,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Router — wraps each function as an HTTP endpoint
// ---------------------------------------------------------------------------
export const aiRouter = Router();

function handle(fn: (body: any) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const result = await fn(req.body ?? {});
      res.json(result);
    } catch (error: any) {
      console.error('AI request failed:', error);
      res.status(500).json({ error: error?.message || 'AI request failed' });
    }
  };
}

aiRouter.post('/analyze-food', handle((b) => analyzeFoodWithAI(b.foodQuery)));
aiRouter.post('/reestimate-unit', handle((b) => reestimateNutrientsForUnit(b.foodName, b.unit)));
aiRouter.post('/recipes', handle((b) => getRecipeSuggestions(b.preferences, b.goals, b.recentFoods ?? [], b.dietPreference)));
aiRouter.post(
  '/insights',
  handle(async (b) => ({
    insight: await getDietaryInsights(b.currentWeight, b.targetWeight, b.recentNutrition, b.goals),
  }))
);

// Streaming insights endpoint. Streams plain-text chunks as they are generated.
// If streaming fails before any text is sent, falls back to the buffered
// getDietaryInsights (which has its own safe fallback) and sends that instead.
aiRouter.post('/insights-stream', async (req: Request, res: Response) => {
  const b = req.body ?? {};
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  let sentAny = false;
  try {
    await getDietaryInsightsStream(
      b.currentWeight,
      b.targetWeight,
      b.recentNutrition,
      b.goals,
      (text) => {
        sentAny = true;
        res.write(text);
      }
    );
  } catch (error: unknown) {
    console.error('Streaming insights failed:', error);
    // Only fall back if we haven't already streamed a partial answer.
    if (!sentAny) {
      const fallback = await getDietaryInsights(
        b.currentWeight,
        b.targetWeight,
        b.recentNutrition,
        b.goals
      );
      res.write(fallback);
    }
  } finally {
    res.end();
  }
});
aiRouter.post(
  '/suggest-meal',
  handle((b) =>
    suggestMeal(
      b.remainingCalories,
      b.remainingProtein,
      b.remainingCarbs,
      b.remainingFats,
      b.remainingFiber,
      b.mealType,
      b.dietPreference
    )
  )
);
aiRouter.post('/suggest-nutrient', handle((b) => suggestFoodForNutrient(b.nutrientName, b.currentAmount, b.targetAmount)));
aiRouter.post(
  '/suggest-goals',
  handle((b) => suggestGoals(b.height, b.currentWeight, b.age, b.gender, b.activityLevel, b.targetWeight))
);
aiRouter.post('/chat-meal', handle((b) => chatLogMeal(b.history ?? [], b.loggedMeals ?? [])));

// Streaming chat endpoint. Responds with newline-delimited JSON (NDJSON):
//   {"t":"msg","v":"<assistant message so far>"}  — emitted as the reply streams
//   {"t":"done","v":<MealChatResult>}             — final, nutrition-grounded result
//   {"t":"error","v":"<reason>"}                  — only if both streaming and fallback fail
// If streaming fails mid-flight, we fall back to the non-streaming path (which
// carries retry/backoff) so the client still gets a usable result.
aiRouter.post('/chat-meal-stream', async (req: Request, res: Response) => {
  const history = req.body?.history ?? [];
  const loggedMeals = req.body?.loggedMeals ?? [];

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering for live streaming
  const write = (obj: unknown) => res.write(`${JSON.stringify(obj)}\n`);

  try {
    const final = await chatLogMealStream(history, loggedMeals, (text) =>
      write({ t: 'msg', v: text })
    );
    write({ t: 'done', v: final });
  } catch (error: unknown) {
    console.error('Streaming chat failed, falling back to non-streaming:', error);
    try {
      const final = await chatLogMeal(history, loggedMeals);
      write({ t: 'done', v: final });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI request failed';
      write({ t: 'error', v: message });
    }
  } finally {
    res.end();
  }
});
