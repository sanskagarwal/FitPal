import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  MealSchema,
  WeightSchema,
  MealInsightRequestSchema,
} from '../../server/validation.js';

const goodNutrients = {
  calories: 250,
  protein: 12,
  carbs: 30,
  fats: 8,
  fiber: 4,
  sugar: 3,
  sodium: 200,
  vitaminA: 10,
  vitaminC: 5,
  vitaminD: 1,
  calcium: 50,
  iron: 2,
  magnesium: 20,
  potassium: 150,
};

const goodProfile = {
  dateOfBirth: '1996-06-05',
  gender: 'male',
  height: 180,
  activityLevel: 'moderate',
  goals: {},
};

describe('RegisterSchema', () => {
  const base = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
    profile: goodProfile,
  };

  it('accepts a valid registration', () => {
    expect(RegisterSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(RegisterSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(RegisterSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a profile with non-positive height', () => {
    expect(
      RegisterSchema.safeParse({ ...base, profile: { ...goodProfile, height: 0 } }).success
    ).toBe(false);
  });

  it('passes through unknown fields (loose)', () => {
    const result = RegisterSchema.safeParse({ ...base, referralCode: 'XYZ' });
    expect(result.success).toBe(true);
  });
});

describe('LoginSchema', () => {
  it('accepts a valid login', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('MealSchema', () => {
  const base = {
    id: 'meal-1',
    userId: 'user-1',
    date: new Date().toISOString(),
    mealType: 'breakfast',
    foods: [
      {
        food: {
          id: 'food-1',
          name: 'Poha',
          servingSize: '1 katori',
          nutrients: goodNutrients,
          isIndian: true,
        },
        quantity: 1,
        unit: 'katori',
        unitQuantity: 1,
      },
    ],
    totalNutrients: goodNutrients,
  };

  it('accepts a valid meal', () => {
    expect(MealSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty foods array', () => {
    expect(MealSchema.safeParse({ ...base, foods: [] }).success).toBe(false);
  });

  it('rejects an invalid meal type', () => {
    expect(MealSchema.safeParse({ ...base, mealType: 'brunch' }).success).toBe(false);
  });

  it('rejects an invalid unit', () => {
    const bad = {
      ...base,
      foods: [{ ...base.foods[0], unit: 'spoonful' }],
    };
    expect(MealSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects non-finite nutrient values', () => {
    const bad = { ...base, totalNutrients: { ...goodNutrients, calories: Infinity } };
    expect(MealSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects negative nutrient values', () => {
    const bad = { ...base, totalNutrients: { ...goodNutrients, protein: -5 } };
    expect(MealSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts an optional jpeg image data URL', () => {
    const withImage = { ...base, image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' };
    expect(MealSchema.safeParse(withImage).success).toBe(true);
  });

  it('rejects a non-image data URL', () => {
    const bad = { ...base, image: 'data:text/html;base64,PHNjcmlwdD4=' };
    expect(MealSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an svg image data URL', () => {
    const bad = { ...base, image: 'data:image/svg+xml;base64,PHN2Zy8+' };
    expect(MealSchema.safeParse(bad).success).toBe(false);
  });
});

describe('WeightSchema', () => {
  const base = {
    id: 'weight-1',
    userId: 'user-1',
    date: new Date().toISOString(),
    weight: 80,
  };

  it('accepts a valid weight', () => {
    expect(WeightSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a negative weight', () => {
    expect(WeightSchema.safeParse({ ...base, weight: -1 }).success).toBe(false);
  });

  it('rejects an absurd weight above the bound', () => {
    expect(WeightSchema.safeParse({ ...base, weight: 100000 }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    expect(WeightSchema.safeParse({ ...base, id: '' }).success).toBe(false);
  });
});

describe('MealInsightRequestSchema', () => {
  const macros = { calories: 500, protein: 25, carbs: 60, fats: 15, fiber: 6 };
  const base = {
    mealType: 'lunch',
    consumed: macros,
    target: macros,
    laterMealTypes: ['evening-snack', 'dinner'],
    dietPreference: 'vegetarian',
  };

  it('accepts a valid request', () => {
    expect(MealInsightRequestSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a request without optional fields', () => {
    expect(
      MealInsightRequestSchema.safeParse({
        mealType: 'breakfast',
        consumed: macros,
        target: macros,
      }).success
    ).toBe(true);
  });

  it('rejects an unknown meal type', () => {
    expect(MealInsightRequestSchema.safeParse({ ...base, mealType: 'brunch' }).success).toBe(false);
  });

  it('rejects an unknown meal type inside laterMealTypes', () => {
    expect(
      MealInsightRequestSchema.safeParse({ ...base, laterMealTypes: ['brunch'] }).success
    ).toBe(false);
  });

  it('rejects negative macro values', () => {
    const bad = { ...base, consumed: { ...macros, protein: -1 } };
    expect(MealInsightRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a non-finite macro value', () => {
    const bad = { ...base, target: { ...macros, calories: Infinity } };
    expect(MealInsightRequestSchema.safeParse(bad).success).toBe(false);
  });
});
