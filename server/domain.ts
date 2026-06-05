import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared server-side domain types.
//
// The string enums are the contract with the frontend and persisted data, so
// they are defined once in `shared/enums.ts` and re-exported here (and from
// `src/types/index.ts`) to stop the two sides drifting. ai.ts, validation.ts
// and nutritionSeed.ts import the enums from this module.
// ---------------------------------------------------------------------------

export { DietPreference, Gender, ActivityLevel, MealType, MealUnit } from './shared/enums.js';

// Loosely-typed nutrient bag shared across responses.
export type NutrientInfo = Record<string, number>;

// Canonical nutrient schema. All fields are required for AI-generated output so
// the model fills every value; validation.ts layers numeric bounds on top.
export const NutrientsSchema = z.object({
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
