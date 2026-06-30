import { describe, it, expect } from 'vitest';
import { getMealSuggestionTargets } from '../../server/services/aiService.js';
import { MEAL_CALORIE_CAPS, MealType } from '../../server/domain.js';

// getMealSuggestionTargets keeps AI meal suggestions to one realistic meal by
// capping the calorie target per meal type and scaling the macros down by the
// same factor, instead of trying to fill the user's entire remaining day.

describe('getMealSuggestionTargets', () => {
  it('caps a large remaining budget at the meal-type calorie cap', () => {
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch);
    expect(targets.calories).toBe(MEAL_CALORIE_CAPS[MealType.Lunch]);
  });

  it('scales macros down by the same factor the calories were capped by', () => {
    // 1500 kcal remaining capped to a 750 kcal lunch -> scale = 0.5.
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch);
    expect(targets.protein).toBe(60);
    expect(targets.carbs).toBe(90);
    expect(targets.fats).toBe(25);
    expect(targets.fiber).toBe(15);
  });

  it('leaves a small remaining budget untouched (no upscaling)', () => {
    const targets = getMealSuggestionTargets(400, 30, 50, 12, 8, MealType.Lunch);
    expect(targets).toEqual({ calories: 400, protein: 30, carbs: 50, fats: 12, fiber: 8 });
  });

  it('applies a lower cap for snacks than for main meals', () => {
    const snack = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.MorningSnack);
    expect(snack.calories).toBe(MEAL_CALORIE_CAPS[MealType.MorningSnack]);
    expect(snack.calories).toBeLessThan(MEAL_CALORIE_CAPS[MealType.Lunch]);
  });

  it('resolves a free-form meal type with spaces (e.g. "morning snack")', () => {
    const fromSpaces = getMealSuggestionTargets(1500, 120, 180, 50, 30, 'morning snack');
    const fromEnum = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.MorningSnack);
    expect(fromSpaces).toEqual(fromEnum);
  });

  it('falls back to a default cap for an unknown meal type', () => {
    const targets = getMealSuggestionTargets(2000, 100, 200, 60, 40, 'brunch');
    expect(targets.calories).toBe(650);
  });

  it('falls back to per-meal cap when daily goal is exceeded (negative remaining)', () => {
    // Sending zero-budget to the AI produces nonsensical suggestions, so the
    // function uses the meal-type cap with balanced macro proportions instead.
    const targets = getMealSuggestionTargets(-200, -10, -20, -5, -3, MealType.Dinner);
    expect(targets.calories).toBe(MEAL_CALORIE_CAPS[MealType.Dinner]);
    expect(targets.protein).toBeGreaterThan(0);
    expect(targets.carbs).toBeGreaterThan(0);
    expect(targets.fats).toBeGreaterThan(0);
    expect(targets.fiber).toBeGreaterThan(0);
  });

  it('honours a user-supplied calorie cap below the meal-type default', () => {
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch, 500);
    expect(targets.calories).toBe(500);
  });

  it('honours a user-supplied calorie cap above the meal-type default', () => {
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch, 900);
    expect(targets.calories).toBe(900);
  });

  it('still caps a user-supplied cap at the remaining daily budget', () => {
    const targets = getMealSuggestionTargets(400, 30, 50, 12, 8, MealType.Lunch, 900);
    expect(targets.calories).toBe(400);
  });

  it('falls back to the meal-type default for an invalid cap override', () => {
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch, 0);
    expect(targets.calories).toBe(MEAL_CALORIE_CAPS[MealType.Lunch]);
  });

  it('clamps each macro to a realistic share of the meal calories', () => {
    // Only 700 kcal remaining but the user is far behind on protein (120g). The
    // raw scaling (scale = 1) would assign the whole day's protein to one meal.
    const targets = getMealSuggestionTargets(700, 120, 60, 60, 30, MealType.Lunch);
    // Protein capped at 40% of 700 kcal / 4 = 70g (not 120g).
    expect(targets.protein).toBe(70);
    // Fats capped at 40% of 700 kcal / 9 = 31g (not 60g).
    expect(targets.fats).toBe(31);
    // Carbs (60g) are under the 65% ceiling, so they pass through unchanged.
    expect(targets.carbs).toBe(60);
  });

  it('leaves macros that already fit within the realistic ceilings untouched', () => {
    // 1500 kcal remaining capped to a 750 kcal lunch -> scale = 0.5.
    const targets = getMealSuggestionTargets(1500, 120, 180, 50, 30, MealType.Lunch);
    // Scaled protein 60g is below the 75g ceiling (40% of 750 / 4).
    expect(targets.protein).toBe(60);
    expect(targets.carbs).toBe(90);
    expect(targets.fats).toBe(25);
  });
});
