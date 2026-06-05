// ---------------------------------------------------------------------------
// Shared enums — single source of truth for both server and frontend.
//
// These string-valued enums are the contract between the React app, the Express
// server and persisted data, so the values must never change. They live here,
// dependency-free, and are re-exported by `server/domain.ts` and
// `src/types/index.ts` so the two sides can no longer drift apart.
//
// This file must stay free of any imports (no zod, no node APIs) so the
// frontend can include it directly. It sits under `server/` because the server
// build is isolated to its own rootDir and cannot import from `src/`.
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

// Calorie budget for a single meal of each type. These keep AI meal suggestions
// to one realistic meal instead of trying to fill the user's entire remaining
// day. Shared so the UI can show the same target it sends to the server.
export const MEAL_CALORIE_CAPS: Record<MealType, number> = {
  [MealType.Breakfast]: 550,
  [MealType.MorningSnack]: 300,
  [MealType.Lunch]: 750,
  [MealType.EveningSnack]: 300,
  [MealType.Dinner]: 750,
};

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
