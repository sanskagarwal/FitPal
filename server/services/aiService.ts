import { generateText, streamText, Output, type LanguageModel, type ModelMessage } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { nutritionRepository } from '../repositories/nutritionRepository.js';
import {
  DietPreference,
  Gender,
  ActivityLevel,
  MealType,
  MealUnit,
  MEAL_CALORIE_CAPS,
  NutrientsSchema,
  type NutrientInfo,
} from '../domain.js';
import {
  SYSTEM_PROMPT,
  NUTRITION_FILL_SYSTEM_PROMPT,
  analyzeFoodPrompt,
  reestimatePrompt,
  recipesPrompt,
  insightsPrompt,
  mealSuggestionPrompt,
  nutrientSuggestionPrompt,
  goalsPrompt,
  nutritionFillPrompt,
  mealChatSystemPrompt,
} from '../prompts/index.js';
import { logger } from '../logger.js';

export interface Food {
  id: string;
  name: string;
  servingSize: string;
  nutrients: NutrientInfo;
  isIndian: boolean;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
}
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  servings: number;
  nutrients: NutrientInfo;
}

type ChatMessage = ModelMessage;

// A normalized image (raw bytes + media type) to attach to a user turn for
// vision-based meal logging. Produced by the image service.
export interface VisionImage {
  data: Uint8Array;
  mediaType: string;
}

// Attach an image to the latest user turn as multimodal content. Replaces that
// turn's plain string with `[text?, image]` parts; if no user turn exists, adds
// an image-only one. Used so the model sees the photo alongside the request.
function attachImageToHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  image: VisionImage
): ChatMessage[] {
  const messages = [...history] as ChatMessage[];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const text = typeof messages[i].content === 'string' ? (messages[i].content as string) : '';
      messages[i] = {
        role: 'user',
        content: [
          ...(text ? [{ type: 'text' as const, text }] : []),
          { type: 'image' as const, image: image.data, mediaType: image.mediaType },
        ],
      };
      return messages;
    }
  }
  messages.push({
    role: 'user',
    content: [{ type: 'image', image: image.data, mediaType: image.mediaType }],
  });
  return messages;
}

// Lazily-created language model, configured entirely from generic env vars via
// the Vercel AI SDK.
let aiModel: LanguageModel | null = null;
export function getModel(): LanguageModel {
  if (aiModel) return aiModel;
  aiModel = createModel(requireEnv('AI_MODEL'));
  return aiModel;
}

// Lazily-created vision model for photo-based logging. Uses AI_VISION_MODEL when
// set, otherwise falls back to AI_MODEL (assumed multimodal). Cached separately
// so a text-only and a vision model can coexist.
let visionModel: LanguageModel | null = null;
export function getVisionModel(): LanguageModel {
  if (visionModel) return visionModel;
  visionModel = createModel(process.env.AI_VISION_MODEL || requireEnv('AI_MODEL'));
  return visionModel;
}

// Build a language model for the configured provider by name. Shared by the
// text and vision model factories so provider wiring lives in one place.
function createModel(model: string): LanguageModel {
  const apiKey = requireEnv('AI_API_KEY');
  const baseURL = process.env.AI_BASE_URL;
  const provider = (process.env.AI_PROVIDER || 'openai-compatible').toLowerCase();

  switch (provider) {
    case 'openai-compatible':
      return createOpenAICompatible({
        name: 'fitpal-ai',
        baseURL: requireEnv('AI_BASE_URL'),
        apiKey,
      })(model);
    case 'azure':
      return createAzure({
        baseURL: `${requireEnv('AI_BASE_URL').replace(/\/+$/, '')}/openai`,
        apiKey,
        apiVersion: requireEnv('AI_API_VERSION'),
        useDeploymentBasedUrls: true,
      }).chat(model);
    case 'anthropic':
      return createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(model);
    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Use "openai-compatible" (default), "azure", "anthropic", or "google".`
      );
  }
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
      logger.warn('AI call failed, retrying', {
        attempt,
        attempts,
        delayMs,
        error: (error as { message?: string })?.message || String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Structured completion. The AI SDK picks the right strategy (native JSON
// schema, JSON mode or tool calling) for the configured model and validates the
// result against the zod schema.
async function completeStructured<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  schemaName: string,
  temperature = 0.7,
  system = SYSTEM_PROMPT,
  model: LanguageModel = getModel()
): Promise<T> {
  const { output } = await withRetry(() =>
    generateText({
      model,
      system,
      messages,
      temperature,
      output: Output.object({ schema, name: schemaName }),
    })
  );
  return output;
}

const ZERO_NUTRIENTS: NutrientInfo = {
  calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0,
  vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 0, iron: 0, magnesium: 0, potassium: 0,
};

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

export async function analyzeFoodWithAI(foodQuery: string): Promise<Food[]> {
  const messages: ChatMessage[] = [{ role: 'user', content: analyzeFoodPrompt(foodQuery) }];
  try {
    const { foods } = await completeStructured(messages, FoodAnalysisSchema, 'food_analysis', 0.2);
    return foods.map((food) => ({
      id: `food-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: food.name,
      servingSize: food.servingSize,
      isIndian: food.isIndian ?? true,
      category: food.category,
      confidence: food.confidence,
      nutrients: food.nutrients as NutrientInfo,
    }));
  } catch (error) {
    // No reliable result - return an empty list so the UI shows "no matches"
    // rather than surfacing a 500. The user can refine the query and retry.
    logger.error('Error analyzing food', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Re-estimate per-unit nutrition
// ---------------------------------------------------------------------------
const ReestimateSchema = z.object({
  servingSize: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  nutrients: NutrientsSchema,
});

export interface UnitNutrition {
  servingSize: string;
  confidence: 'high' | 'medium' | 'low';
  nutrients: NutrientInfo;
}

export async function reestimateNutrientsForUnit(
  foodName: string,
  unit: MealUnit
): Promise<UnitNutrition> {
  const messages: ChatMessage[] = [{ role: 'user', content: reestimatePrompt(foodName, unit) }];
  try {
    const result = await completeStructured(messages, ReestimateSchema, 'reestimate_unit', 0.2);
    return {
      servingSize: result.servingSize,
      confidence: result.confidence,
      nutrients: result.nutrients as NutrientInfo,
    };
  } catch (error) {
    // Fallback: a safe zero-nutrition, low-confidence estimate so callers always
    // get a usable shape (the UI flags low confidence for the user to adjust).
    logger.error('Error re-estimating unit nutrition', { error: error instanceof Error ? error.message : String(error) });
    return { servingSize: `1 ${unit}`, confidence: 'low', nutrients: { ...ZERO_NUTRIENTS } };
  }
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

export async function getRecipeSuggestions(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: DietPreference
): Promise<Recipe[]> {
  const messages: ChatMessage[] = [
    { role: 'user', content: recipesPrompt(preferences, goals, recentFoods, dietPreference) },
  ];
  try {
    const { recipes } = await completeStructured(messages, RecipesSchema, 'recipe_suggestions', 0.6);
    return recipes.map((recipe) => ({
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      nutrients: recipe.nutrients as NutrientInfo,
    }));
  } catch (error) {
    // No suggestions available - return an empty list rather than a 500.
    logger.error('Error getting recipe suggestions', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dietary insights
// ---------------------------------------------------------------------------
const INSIGHT_CATEGORIES = [
  'calories',
  'protein',
  'carbs',
  'fats',
  'fiber',
  'hydration',
  'general',
] as const;

const DietaryInsightSchema = z.object({
  summary: z.string(),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        category: z.enum(INSIGHT_CATEGORIES),
      })
    )
    .min(1),
});

type DietaryInsight = z.infer<typeof DietaryInsightSchema>;

const INSIGHTS_FALLBACK: DietaryInsight = {
  summary: 'A few simple habits will help you move toward your goal.',
  recommendations: [
    {
      title: 'Prioritise protein at every meal',
      detail: 'Include dal, paneer, curd or eggs so you stay full and preserve muscle.',
      category: 'protein',
    },
    {
      title: 'Watch portion sizes',
      detail: 'Use a standard katori and limit fried snacks and refined carbs.',
      category: 'calories',
    },
    {
      title: 'Stay hydrated and consistent',
      detail: 'Drink water through the day and keep regular meal times.',
      category: 'hydration',
    },
  ],
};

export async function getDietaryInsights(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string
): Promise<DietaryInsight> {
  const messages: ChatMessage[] = [
    { role: 'user', content: insightsPrompt(currentWeight, targetWeight, recentNutrition, goals) },
  ];

  try {
    return await completeStructured(messages, DietaryInsightSchema, 'dietary_insights', 0.6);
  } catch (error) {
    logger.error('Error getting insights', { error: error instanceof Error ? error.message : String(error) });
    return INSIGHTS_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// Meal suggestion
// ---------------------------------------------------------------------------
const MealSuggestionItemSchema = z.object({
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

const MealSuggestionsSchema = z.object({
  suggestions: z.array(MealSuggestionItemSchema).min(3),
});

// How many distinct options we ask the model for each time.
const MEAL_SUGGESTION_COUNT = 3;

// Regional cuisines we rotate through so re-clicking surfaces genuinely
// different dishes rather than variants of the same meal. A random subset is
// fed to the model as a soft nudge each call.
const INDIAN_CUISINE_STYLES = [
  'North Indian',
  'South Indian',
  'Bengali',
  'Gujarati',
  'Maharashtrian',
  'Punjabi',
  'Rajasthani',
  'Kerala',
  'Hyderabadi',
  'Goan',
  'Kashmiri',
  'Tamil',
  'Andhra',
  'Indo-Chinese',
];

function buildVarietyHint(): string {
  const shuffled = [...INDIAN_CUISINE_STYLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MEAL_SUGGESTION_COUNT).join(', ');
}

// Distinct fallbacks used if the AI call fails, so the user still sees variety.
const MEAL_SUGGESTION_FALLBACK = [
  {
    name: 'Dal, roti and sabzi',
    description: 'A simple, balanced North Indian plate.',
    ingredients: [
      { item: 'Dal (lentils)', portion: '1 katori' },
      { item: 'Roti', portion: '2 pieces' },
      { item: 'Mixed vegetable sabzi', portion: '1 katori' },
      { item: 'Curd', portion: '1 katori' },
    ],
    reason: 'Balances protein, carbs, fibre and a little healthy fat.',
  },
  {
    name: 'Sambar rice with poriyal',
    description: 'A comforting South Indian combination.',
    ingredients: [
      { item: 'Sambar', portion: '1 katori' },
      { item: 'Steamed rice', portion: '1 katori' },
      { item: 'Vegetable poriyal', portion: '1 katori' },
    ],
    reason: 'Lentils and vegetables give protein and fibre with light fat.',
  },
  {
    name: 'Rajma with jeera rice',
    description: 'A protein-rich kidney bean curry with cumin rice.',
    ingredients: [
      { item: 'Rajma (kidney beans)', portion: '1 katori' },
      { item: 'Jeera rice', portion: '1 katori' },
      { item: 'Salad', portion: '1 plate' },
    ],
    reason: 'Beans add plant protein and fibre to keep you full.',
  },
];

// Lighter fallbacks for snack meal types, so a failed AI call still returns
// simple snack foods rather than full plated meals.
const SNACK_SUGGESTION_FALLBACK = [
  {
    name: 'Roasted chana',
    description: 'A crunchy, protein-rich savoury snack.',
    ingredients: [{ item: 'Roasted chana', portion: '1 small bowl (handful)' }],
    reason: 'High in protein and fibre with very little fat.',
  },
  {
    name: 'Fruit and curd',
    description: 'A light, refreshing sweet snack.',
    ingredients: [
      { item: 'Seasonal fruit', portion: '1 bowl' },
      { item: 'Curd', portion: '1 katori' },
    ],
    reason: 'Natural sugars, fibre and a little protein from curd.',
  },
  {
    name: 'Sprouts chaat',
    description: 'A tangy, no-cook protein snack.',
    ingredients: [
      { item: 'Moong sprouts', portion: '1 katori' },
      { item: 'Onion, tomato and lemon', portion: 'to taste' },
    ],
    reason: 'Plant protein and fibre that keeps you full between meals.',
  },
];

const MEAL_CALORIE_CAP_FALLBACK = 650;

// Snack meal types get lighter, simpler suggestions than full meals.
function isSnackMealType(mealType: string): boolean {
  return /snack/.test(mealType.toLowerCase());
}

// Map a free-form meal type (e.g. "morning snack") to its MealType enum value
// so spelling/spacing differences still resolve to the right calorie budget.
function resolveMealType(mealType: string): MealType | undefined {
  const normalized = mealType.trim().toLowerCase().replace(/\s+/g, '-');
  return (Object.values(MealType) as string[]).includes(normalized)
    ? (normalized as MealType)
    : undefined;
}

function normalizeMealTarget(value: number) {
  return Math.max(0, Math.round(value));
}

export function getMealSuggestionTargets(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  calorieCapOverride?: number
) {
  const resolved = resolveMealType(mealType);
  const defaultCap = resolved ? MEAL_CALORIE_CAPS[resolved] : MEAL_CALORIE_CAP_FALLBACK;
  const calorieCap =
    typeof calorieCapOverride === 'number' && Number.isFinite(calorieCapOverride) && calorieCapOverride > 0
      ? Math.round(calorieCapOverride)
      : defaultCap;
  const calorieTarget = Math.min(normalizeMealTarget(remainingCalories), calorieCap);
  const safeRemainingCalories = Math.max(0, remainingCalories);
  const scale = safeRemainingCalories > 0 ? Math.min(1, calorieTarget / safeRemainingCalories) : 0;

  const maxFromCalories = (energyFraction: number, kcalPerGram: number) =>
    Math.round((calorieTarget * energyFraction) / kcalPerGram);

  return {
    calories: calorieTarget,
    protein: Math.min(normalizeMealTarget(remainingProtein * scale), maxFromCalories(0.4, 4)),
    carbs: Math.min(normalizeMealTarget(remainingCarbs * scale), maxFromCalories(0.65, 4)),
    fats: Math.min(normalizeMealTarget(remainingFats * scale), maxFromCalories(0.4, 9)),
    fiber: normalizeMealTarget(remainingFiber * scale),
  };
}

export async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  dietPreference?: DietPreference,
  calorieCap?: number
) {
  const mealTargets = getMealSuggestionTargets(
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFats,
    remainingFiber,
    mealType,
    calorieCap
  );

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: mealSuggestionPrompt({
        remainingCalories: mealTargets.calories,
        remainingProtein: mealTargets.protein,
        remainingCarbs: mealTargets.carbs,
        remainingFats: mealTargets.fats,
        remainingFiber: mealTargets.fiber,
        mealType,
        dietPreference,
        count: MEAL_SUGGESTION_COUNT,
        varietyHint: buildVarietyHint(),
      }),
    },
  ];

  try {
    // Moderate temperature: enough for varied dishes (variety is also driven by
    // the cuisine seed and explicit instructions) while keeping the reported
    // nutrition numbers reliable. Too high makes the macros sloppy.
    const parsed = await completeStructured(messages, MealSuggestionsSchema, 'meal_suggestions', 0.7);
    return parsed.suggestions.map((s) => ({
      name: s.name || `${mealType} suggestion`,
      description: s.description || '',
      mealType,
      ingredients: s.ingredients
        .map((i) => ({ item: String(i.item || ''), portion: String(i.portion || '') }))
        .filter((i) => i.item),
      nutrition: {
        calories: Math.round(s.nutrition.calories || 0),
        protein: Math.round(s.nutrition.protein || 0),
        carbs: Math.round(s.nutrition.carbs || 0),
        fats: Math.round(s.nutrition.fats || 0),
        fiber: Math.round(s.nutrition.fiber || 0),
      },
      reason: s.reason || '',
    }));
  } catch (error) {
    logger.error('Error getting meal suggestion', { error: error instanceof Error ? error.message : String(error) });
    const fallback = isSnackMealType(mealType) ? SNACK_SUGGESTION_FALLBACK : MEAL_SUGGESTION_FALLBACK;
    return fallback.map((meal) => ({
      ...meal,
      mealType,
      nutrition: {
        calories: mealTargets.calories,
        protein: mealTargets.protein,
        carbs: mealTargets.carbs,
        fats: mealTargets.fats,
        fiber: mealTargets.fiber,
      },
    }));
  }
}

// ---------------------------------------------------------------------------
// Nutrient food suggestion
// ---------------------------------------------------------------------------
const NutrientSuggestionSchema = z.object({
  foods: z.array(z.object({ name: z.string(), content: z.string(), portion: z.string() })),
  tips: z.array(z.string()),
});

export async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
) {
  const messages: ChatMessage[] = [
    { role: 'user', content: nutrientSuggestionPrompt(nutrientName, currentAmount, targetAmount) },
  ];

  try {
    const parsed = await completeStructured(messages, NutrientSuggestionSchema, 'nutrient_suggestion', 0.45);
    return {
      nutrient: nutrientName,
      foods: parsed.foods
        .map((f) => ({ name: String(f.name || ''), content: String(f.content || ''), portion: String(f.portion || '') }))
        .filter((f) => f.name),
      tips: parsed.tips.map((t) => String(t)).filter(Boolean),
    };
  } catch (error) {
    logger.error('Error getting food suggestion', { error: error instanceof Error ? error.message : String(error) });
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

export async function suggestGoals(
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
      content: goalsPrompt({ height, currentWeight, age, gender, activityLevel, targetWeight }),
    },
  ];

  try {
    return await completeStructured(messages, GoalsSchema, 'nutrition_goals', 0.1);
  } catch (error) {
    logger.error('Error getting goal suggestions', { error: error instanceof Error ? error.message : String(error) });
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
      explanation: `- Maintenance (TDEE): ~${maintenanceCalories} kcal/day\n- Target: ${calories} kcal/day - ${adjustmentNote}\n- Macros: ${protein}g protein, ${carbs}g carbs, ${fats}g fats`,
    };
  }
}

// ---------------------------------------------------------------------------
// Agentic, conversational meal logging
// ---------------------------------------------------------------------------

// Stage 1 - extraction only. The model identifies foods, units, quantities and
// the action; it does NOT estimate nutrition (that is stage 2). Dropping the
// 14-field nutrients object per food makes this call's output much smaller, so
// it streams the assistant `message` sooner than the old single-shot schema.
const MealExtractSchema = z.object({
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
    })
  ),
});

type ExtractedMeal = z.infer<typeof MealExtractSchema>;
type ExtractedFood = ExtractedMeal['foods'][number];

const NutritionFillSchema = z.object({
  foods: z.array(
    z.object({
      servingSize: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      nutrients: NutrientsSchema,
    })
  ),
});

interface FilledNutrition {
  servingSize: string;
  confidence: 'high' | 'medium' | 'low';
  nutrients: NutrientInfo;
}

// One batched model call covering several foods at once (not one call per food).
async function batchFillNutrition(foods: ExtractedFood[]): Promise<FilledNutrition[]> {
  const messages: ChatMessage[] = [{ role: 'user', content: nutritionFillPrompt(foods) }];
  const { foods: filled } = await completeStructured(
    messages,
    NutritionFillSchema,
    'nutrition_fill',
    0.2,
    NUTRITION_FILL_SYSTEM_PROMPT
  );
  return filled.map((f) => ({
    servingSize: f.servingSize,
    confidence: f.confidence,
    nutrients: f.nutrients as NutrientInfo,
  }));
}

// Single-food fallback, reusing the existing per-unit re-estimator.
async function singleFillNutrition(food: ExtractedFood): Promise<FilledNutrition> {
  const { servingSize, confidence, nutrients } = await reestimateNutrientsForUnit(food.name, food.unit);
  return { servingSize, confidence, nutrients };
}

// Always returns exactly one result per input food. Tries the batched call, then
// fills any gaps individually so a length mismatch or batch failure never breaks
// the request.
async function fillNutrition(foods: ExtractedFood[]): Promise<FilledNutrition[]> {
  if (foods.length === 0) return [];
  let batched: FilledNutrition[] = [];
  try {
    batched = await batchFillNutrition(foods);
  } catch (error) {
    logger.warn('Batched nutrition fill failed, filling individually', { error: error instanceof Error ? error.message : String(error) });
  }
  if (batched.length === foods.length) return batched;
  const out: FilledNutrition[] = [];
  for (let i = 0; i < foods.length; i++) {
    out.push(batched[i] ?? (await singleFillNutrition(foods[i])));
  }
  return out;
}

interface GroundedFood {
  name: string;
  servingSize: string;
  unit: MealUnit;
  unitQuantity: number;
  isIndian: boolean;
  category?: string;
  confidence: 'high' | 'medium' | 'low';
  nutrients: NutrientInfo;
}

// Resolve per-unit nutrition for extracted foods: cache first (consistent + free),
// then ONE batched model call for any misses, learning confident results back
// into the cache. When `useModel` is false (clarifying turns whose proposal is
// never shown) misses get a zero placeholder so no model call is made at all.
async function resolveFoodsNutrition(
  foods: ExtractedFood[],
  useModel: boolean
): Promise<GroundedFood[]> {
  const grounded: (GroundedFood | null)[] = new Array(foods.length).fill(null);
  const misses: { index: number; food: ExtractedFood }[] = [];

  foods.forEach((f, i) => {
    const cached = nutritionRepository.get(f.name, f.unit);
    if (cached) {
      grounded[i] = {
        name: f.name,
        servingSize: cached.servingSize || f.servingSize,
        unit: f.unit,
        unitQuantity: f.unitQuantity,
        isIndian: f.isIndian,
        category: f.category ?? undefined,
        confidence: 'high',
        nutrients: cached.nutrients as NutrientInfo,
      };
    } else {
      misses.push({ index: i, food: f });
    }
  });

  if (misses.length > 0) {
    const filled = useModel
      ? await fillNutrition(misses.map((m) => m.food))
      : misses.map(() => ({ servingSize: '', confidence: 'low' as const, nutrients: { ...ZERO_NUTRIENTS } }));
    misses.forEach((m, j) => {
      const fill = filled[j];
      if (useModel && fill.confidence === 'high') {
        nutritionRepository.put(m.food.name, m.food.unit, {
          servingSize: fill.servingSize,
          nutrients: fill.nutrients as Record<string, number>,
        });
      }
      grounded[m.index] = {
        name: m.food.name,
        servingSize: fill.servingSize || m.food.servingSize,
        unit: m.food.unit,
        unitQuantity: m.food.unitQuantity,
        isIndian: m.food.isIndian,
        category: m.food.category ?? undefined,
        confidence: fill.confidence,
        nutrients: fill.nutrients,
      };
    });
  }

  return grounded as GroundedFood[];
}

// Combine a stage-1 extraction with resolved nutrition into the final result.
// Nutrition is only looked up via the model when the meal is ready to act on;
// clarifying turns (need_info) skip it, keeping those turns to a single call.
async function assembleChatResult(extracted: ExtractedMeal) {
  const foods = await resolveFoodsNutrition(extracted.foods, extracted.status === 'ready');
  return {
    status: extracted.status,
    action: extracted.action,
    targetMealId: extracted.targetMealId ?? null,
    message: extracted.message || '',
    mealType: extracted.mealType ?? undefined,
    time: extracted.time ?? null,
    foods,
  };
}

export interface LoggedMealSummary {
  id: string;
  mealType: string;
  time?: string | null;
  foods: { name: string; unitQuantity: number; unit: string }[];
}

export async function chatLogMeal(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[] = [],
  image?: VisionImage
) {
  const system = mealChatSystemPrompt(loggedMeals);
  const messages = image ? attachImageToHistory(history, image) : ([...history] as ChatMessage[]);
  const extracted = await completeStructured(
    messages,
    MealExtractSchema,
    'meal_extract',
    0.2,
    system,
    image ? getVisionModel() : getModel()
  );
  return assembleChatResult(extracted);
}

// Streaming variant: emits the assistant's `message` text via `onMessage` as it
// is generated (the message is an early field in the schema, so it arrives
// before the larger `foods` array), then returns the fully-grounded result.
export async function chatLogMealStream(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[],
  onMessage: (text: string) => void,
  onMessageDone?: () => void,
  image?: VisionImage
) {
  const system = mealChatSystemPrompt(loggedMeals);
  const messages = image ? attachImageToHistory(history, image) : ([...history] as ChatMessage[]);
  const result = streamText({
    model: image ? getVisionModel() : getModel(),
    system,
    messages,
    temperature: 0.2,
    output: Output.object({ schema: MealExtractSchema, name: 'meal_extract' }),
  });

  let lastMessage = '';
  for await (const partial of result.partialOutputStream) {
    if (typeof partial?.message === 'string' && partial.message !== lastMessage) {
      lastMessage = partial.message;
      onMessage(lastMessage);
    }
  }

  const extracted = await result.output;
  if (extracted.status === 'ready' && extracted.foods.length > 0) onMessageDone?.();
  return assembleChatResult(extracted);
}
