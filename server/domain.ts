import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared server-side domain types.
//
// These enums mirror src/types but live here because the server is built in
// isolation (its tsconfig rootDir is ./server). The string values are the
// contract with the frontend and persisted data, so they must not change.
// This is the single source of truth on the server — ai.ts, validation.ts and
// nutritionSeed.ts all import from here instead of re-declaring strings.
// ---------------------------------------------------------------------------

export enum DietPreference {
  Vegetarian = 'vegetarian',
  Eggetarian = 'eggetarian',
  NonVegetarian = 'non-vegetarian',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export enum ActivityLevel {
  Sedentary = 'sedentary',
  Light = 'light',
  Moderate = 'moderate',
  Active = 'active',
  VeryActive = 'very-active',
}

export enum MealType {
  Breakfast = 'breakfast',
  MorningSnack = 'morning-snack',
  Lunch = 'lunch',
  EveningSnack = 'evening-snack',
  Dinner = 'dinner',
}

export enum MealUnit {
  Serving = 'serving',
  Katori = 'katori',
  Bowl = 'bowl',
  Plate = 'plate',
  Cup = 'cup',
  Glass = 'glass',
  Tbsp = 'tbsp',
  Tsp = 'tsp',
  Piece = 'piece',
  Slice = 'slice',
  Gram = 'gram',
  Ml = 'ml',
  Oz = 'oz',
}

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
