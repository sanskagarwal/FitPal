import { Food, NutrientInfo, Recipe, DietPreference, MealType, MealUnit } from '../types';

// All AI work now runs on the FitPal server (so the Azure OpenAI key never
// reaches the browser). These helpers just call the backend `/api/ai/*` routes
// and preserve the original function signatures used across the app.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function aiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `AI request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // response had no JSON body — keep the default message
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

export async function getDietaryInsights(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string
): Promise<string> {
  try {
    const { insight } = await aiCall<{ insight: string }>('insights', {
      currentWeight,
      targetWeight,
      recentNutrition,
      goals,
    });
    return insight;
  } catch (error) {
    console.error('Error getting insights:', error);
    return 'Focus on portion control and include more protein-rich foods like dal, paneer, and yogurt. Stay hydrated and maintain regular meal times.';
  }
}

// Streaming variant: calls `onChunk` with each text delta as insights generate,
// and resolves with the full text. Falls back to the buffered endpoint if the
// stream is unavailable.
export async function getDietaryInsightsStream(
  currentWeight: number,
  targetWeight: number,
  recentNutrition: NutrientInfo,
  goals: string,
  onChunk: (text: string) => void
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/insights-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentWeight, targetWeight, recentNutrition, goals }),
    });

    if (!response.ok || !response.body) {
      return getDietaryInsights(currentWeight, targetWeight, recentNutrition, goals);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        full += chunk;
        onChunk(chunk);
      }
    }
    return full.trim();
  } catch (error) {
    console.error('Error streaming insights:', error);
    return getDietaryInsights(currentWeight, targetWeight, recentNutrition, goals);
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

export async function suggestMeal(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number,
  remainingFiber: number,
  mealType: string,
  dietPreference?: DietPreference
): Promise<MealSuggestion> {
  return aiCall<MealSuggestion>('suggest-meal', {
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFats,
    remainingFiber,
    mealType,
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

export interface ParsedMealFood {
  name: string;
  servingSize: string; // describes ONE unit, e.g. "1 katori (~150g)"
  unit: MealUnit;
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
  mealType?: MealType;
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

export async function chatLogMeal(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[] = []
): Promise<MealChatResult> {
  return aiCall<MealChatResult>('chat-meal', { history, loggedMeals });
}

// Streaming variant. Calls `onMessage` with the assistant's reply text as it is
// generated, then resolves with the final, nutrition-grounded result. Falls
// back to the non-streaming endpoint if streaming is unavailable.
export async function chatLogMealStream(
  history: { role: 'user' | 'assistant'; content: string }[],
  loggedMeals: LoggedMealSummary[],
  onMessage: (text: string) => void
): Promise<MealChatResult> {
  const response = await fetch(`${API_BASE_URL}/ai/chat-meal-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, loggedMeals }),
  });

  if (response.status === 429) {
    // Rate limited — don't waste another request on the fallback.
    let message = 'Too many AI requests. Please wait a moment and try again.';
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // no JSON body — keep the default message
    }
    throw new Error(message);
  }

  if (!response.ok || !response.body) {
    // Streaming endpoint failed otherwise — fall back to the buffered call.
    return chatLogMeal(history, loggedMeals);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final: MealChatResult | null = null;

  // The server emits newline-delimited JSON: {"t":"msg"|"done"|"error","v":...}
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: { t: string; v: unknown };
    try {
      event = JSON.parse(trimmed);
    } catch {
      return; // ignore partial/garbled lines
    }
    if (event.t === 'msg' && typeof event.v === 'string') {
      onMessage(event.v);
    } else if (event.t === 'done') {
      final = event.v as MealChatResult;
    } else if (event.t === 'error') {
      throw new Error(typeof event.v === 'string' ? event.v : 'AI request failed');
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  }
  if (buffer.trim()) handleLine(buffer);

  if (!final) throw new Error('AI request did not return a result');
  return final;
}
