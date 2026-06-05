import { MealType, MealUnit, NutrientInfo } from '../../types';

export const MEAL_TYPES = Object.values(MealType);
export const QUANTITY_UNITS = Object.values(MealUnit);

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Upper bounds mirror the server's meal validation so the UI never produces a
// value the backend will reject. They are deliberately generous.
export const MAX_CALORIES = 100000;
export const MAX_QUANTITY = 10000;

// Clamp a possibly-NaN/Infinity/out-of-range number into [min, max], falling
// back to `fallback` when the value isn't a finite number.
export const clampNumber = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

// Turn a chat failure into a user-facing message that reflects the actual
// cause, instead of always telling the user to rephrase. A connectivity or
// server-side outage is not the user's fault and rephrasing won't help.
export const describeChatError = (err: unknown): string => {
  // fetch() rejects with a TypeError on network failure; also check offline.
  const isNetwork =
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    (err instanceof TypeError &&
      /failed to fetch|network|load failed/i.test(err.message));
  if (isNetwork) {
    return "I couldn't reach the server. Check your connection and try again.";
  }
  // Server/model outages surface as 5xx or known AI failure messages.
  const message = err instanceof Error ? err.message : '';
  if (/too many|rate limit|429/i.test(message)) {
    return message || 'Too many requests. Please wait a moment and try again.';
  }
  if (/ai request failed|unavailable|timeout|timed out|5\d\d|environment variable/i.test(message)) {
    return 'The assistant is temporarily unavailable. Please try again in a moment.';
  }
  // Otherwise it's most likely genuine ambiguity in the request.
  return 'Sorry, I had trouble understanding that. Could you rephrase what you ate?';
};

// Pluralize a serving unit for display (e.g. 2 "katoris", 3 "pieces").
export const formatUnit = (unit: string, quantity: number): string => {
  if (quantity === 1) return unit;
  const noPlural = ['serving', 'oz', 'gram', 'ml', 'tbsp', 'tsp'];
  if (noPlural.includes(unit)) return unit;
  return `${unit}s`;
};

// Format a Date as HH:mm for the AI meal context.
export const toHHmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const EMPTY_NUTRIENTS: NutrientInfo = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  vitaminA: 0,
  vitaminC: 0,
  vitaminD: 0,
  calcium: 0,
  iron: 0,
  magnesium: 0,
  potassium: 0,
};

// Sum per-unit nutrients across a list of items, each scaled by its quantity.
// Used for both the manual "Selected Foods" totals and AI-proposed meals.
export const sumNutrients = (
  items: { nutrients: NutrientInfo; quantity: number }[]
): NutrientInfo =>
  items.reduce<NutrientInfo>((acc, { nutrients: n, quantity: q }) => ({
    calories: acc.calories + n.calories * q,
    protein: acc.protein + n.protein * q,
    carbs: acc.carbs + n.carbs * q,
    fats: acc.fats + n.fats * q,
    fiber: (acc.fiber || 0) + (n.fiber || 0) * q,
    sugar: (acc.sugar || 0) + (n.sugar || 0) * q,
    sodium: (acc.sodium || 0) + (n.sodium || 0) * q,
    vitaminA: (acc.vitaminA || 0) + (n.vitaminA || 0) * q,
    vitaminC: (acc.vitaminC || 0) + (n.vitaminC || 0) * q,
    vitaminD: (acc.vitaminD || 0) + (n.vitaminD || 0) * q,
    calcium: (acc.calcium || 0) + (n.calcium || 0) * q,
    iron: (acc.iron || 0) + (n.iron || 0) * q,
    magnesium: (acc.magnesium || 0) + (n.magnesium || 0) * q,
    potassium: (acc.potassium || 0) + (n.potassium || 0) * q,
  }), { ...EMPTY_NUTRIENTS });
