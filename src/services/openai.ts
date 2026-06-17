import {
  Food,
  NutrientInfo,
  Recipe,
  DietPreference,
  DietaryInsight,
  MealSuggestion,
  MealInsight,
  NutrientSuggestion,
  MealChatResult,
  LoggedMealSummary,
  MealChatMessage,
} from '../types';
import { readNdjsonStream } from './ndjsonStream';

// All AI work now runs on the FitPal server (so the Azure OpenAI key never
// reaches the browser). These helpers just call the backend `/api/ai/*` routes
// and preserve the original function signatures used across the app.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function aiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `AI request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // response had no JSON body - keep the default message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function analyzeFoodWithAI(foodQuery: string): Promise<Food[]> {
  return aiCall<Food[]>('analyze-food', { foodQuery });
}

export async function reestimateNutrientsForUnit(
  foodName: string,
  unit: string
): Promise<{ servingSize: string; confidence: 'high' | 'medium' | 'low'; nutrients: NutrientInfo }> {
  return aiCall('reestimate-unit', { foodName, unit });
}

export async function getRecipeSuggestions(
  preferences: string,
  goals: string,
  recentFoods: string[],
  dietPreference?: DietPreference
): Promise<Recipe[]> {
  return aiCall<Recipe[]>('recipes', { preferences, goals, recentFoods, dietPreference });
}

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
  try {
    return await aiCall<DietaryInsight>('insights', {
      currentWeight,
      targetWeight,
      recentNutrition,
      goals,
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    return INSIGHTS_FALLBACK;
  }
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
): Promise<MealSuggestion[]> {
  return aiCall<MealSuggestion[]>('suggest-meal', {
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFats,
    remainingFiber,
    mealType,
    dietPreference,
    calorieCap,
  });
}

interface MealMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export async function getMealInsight(
  mealType: string,
  consumed: MealMacros,
  target: MealMacros,
  laterMealTypes: string[],
  dietPreference?: DietPreference
): Promise<MealInsight> {
  return aiCall<MealInsight>('meal-insight', {
    mealType,
    consumed,
    target,
    laterMealTypes,
    dietPreference,
  });
}

export async function suggestFoodForNutrient(
  nutrientName: string,
  currentAmount: number,
  targetAmount: number
): Promise<NutrientSuggestion> {
  return aiCall<NutrientSuggestion>('suggest-nutrient', {
    nutrientName,
    currentAmount,
    targetAmount,
  });
}

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
  return aiCall('suggest-goals', {
    height,
    currentWeight,
    age,
    gender,
    activityLevel,
    targetWeight,
  });
}

// ---------------------------------------------------------------------------
// Agentic, conversational meal logging
// ---------------------------------------------------------------------------

export async function chatLogMeal(
  history: MealChatMessage[],
  loggedMeals: LoggedMealSummary[] = []
): Promise<MealChatResult> {
  return aiCall<MealChatResult>('chat-meal', {
    history,
    loggedMeals,
    localTime: new Date().toLocaleString(),
  });
}

// Streaming variant. Calls `onMessage` with the assistant's reply text as it is
// generated, then resolves with the final, nutrition-grounded result. Falls
// back to the non-streaming endpoint if streaming is unavailable. `onMessageDone`
// fires once the reply has fully streamed but the server is still grounding the
// meal's nutrition, so the UI can show a "preparing" indicator for that gap.
// An optional compressed image (data URL) attaches a photo to this turn; the
// server analyzes it with the vision model and echoes the normalized image back
// on the final result so it can be persisted on confirm.
export async function chatLogMealStream(
  history: MealChatMessage[],
  loggedMeals: LoggedMealSummary[],
  onMessage: (text: string) => void,
  onMessageDone?: () => void,
  image?: string
): Promise<MealChatResult> {
  const response = await fetch(`${API_BASE_URL}/ai/chat-meal-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      history,
      loggedMeals,
      localTime: new Date().toLocaleString(),
      ...(image ? { image } : {}),
    }),
  });

  if (response.status === 429) {
    // Rate limited - don't waste another request on the fallback.
    let message = 'Too many AI requests. Please wait a moment and try again.';
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // no JSON body - keep the default message
    }
    throw new Error(message);
  }

  if (!response.ok || !response.body) {
    // The non-streaming fallback endpoint cannot analyze a photo, so when an
    // image is attached we surface the error instead of silently dropping it.
    if (image) {
      throw new Error('Could not analyze the photo. Please try again.');
    }
    // Streaming endpoint failed otherwise - fall back to the buffered call.
    return chatLogMeal(history, loggedMeals);
  }

  // The server emits newline-delimited JSON: {"t":"msg"|"done"|"error","v":...}
  let final: MealChatResult | null = null;
  let streamError: string | null = null;

  await readNdjsonStream(response.body, (event) => {
    if (event.t === 'msg' && typeof event.v === 'string') {
      onMessage(event.v);
    } else if (event.t === 'msg_done') {
      onMessageDone?.();
    } else if (event.t === 'done') {
      final = event.v as MealChatResult;
    } else if (event.t === 'error') {
      streamError = typeof event.v === 'string' ? event.v : 'AI request failed';
    }
  });

  if (streamError) throw new Error(streamError);
  if (!final) throw new Error('AI request did not return a result');
  return final;
}
