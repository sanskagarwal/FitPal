import { z } from 'zod';
import { MealType, MealUnit, NutrientsSchema } from './domain.js';

// ---------------------------------------------------------------------------
// Meal payload validation.
//
// The client computes nutrient totals and posts the full meal object, which the
// storage layer trusts and persists verbatim. This guards that boundary against
// malformed data (NaN/Infinity, negatives, absurd magnitudes, missing fields)
// before it reaches the database. Schemas use `.passthrough()` and we store the
// ORIGINAL object so the persisted shape stays byte-for-byte unchanged.
// ---------------------------------------------------------------------------

// A non-negative quantity with a generous upper bound. z.number() already
// rejects NaN/Infinity in Zod v4, so no .finite() is needed.
const amount = (max: number) => z.number().nonnegative().max(max);

// Reuse the canonical nutrient schema, layering numeric bounds on top so the
// field list lives in exactly one place (domain.ts).
const BoundedNutrients = NutrientsSchema.refine(
  (n) => Object.values(n).every((v) => Number.isFinite(v) && v >= 0 && v <= 1_000_000),
  { message: 'nutrient values must be finite, non-negative and within range' }
);

const FoodSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    servingSize: z.string(),
    nutrients: BoundedNutrients,
    isIndian: z.boolean(),
    category: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
  })
  .loose();

const FoodEntrySchema = z
  .object({
    food: FoodSchema,
    quantity: amount(10000),
    unit: z.enum(MealUnit),
    unitQuantity: amount(10000),
  })
  .loose();

export const MealSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    // Date is serialized to a string over JSON; accept either and don't coerce.
    date: z.union([z.string().min(1), z.date()]),
    mealType: z.enum(MealType),
    foods: z.array(FoodEntrySchema).min(1),
    totalNutrients: BoundedNutrients,
    notes: z.string().optional(),
  })
  .loose();

// Validate a meal payload. Returns { ok: true } or { ok: false, error } with a
// short human-readable reason for a 400 response.
export function validateMeal(
  payload: unknown
): { ok: true } | { ok: false; error: string } {
  const result = MealSchema.safeParse(payload);
  if (result.success) return { ok: true };
  const issue = result.error.issues[0];
  const path = issue?.path.join('.') || 'meal';
  return { ok: false, error: `Invalid meal: ${path} — ${issue?.message ?? 'invalid'}` };
}
