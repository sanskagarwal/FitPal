import { z } from 'zod';
import { MealType, MealUnit, NutrientsSchema } from './domain.js';

// ---------------------------------------------------------------------------
// Request validation schemas (zod) for every write route.
//
// Used via the `validateBody` middleware. Schemas use `.loose()` so unknown
// fields pass through and the persisted shape stays byte-for-byte unchanged,
// while still guarding the boundary against malformed data (NaN/Infinity,
// negatives, absurd magnitudes, missing fields).
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

// --- Auth -----------------------------------------------------------------

// Profile is a rich nested object; validate the load-bearing fields and let the
// rest pass through so the client can evolve it without breaking the contract.
const ProfileSchema = z
  .object({
    dateOfBirth: z.string().min(1),
    gender: z.string().min(1),
    height: z.number().positive(),
    activityLevel: z.string().min(1),
    goals: z.object({}).loose(),
  })
  .loose();

export const RegisterSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'password must be at least 8 characters'),
    profile: ProfileSchema,
  })
  .loose();

export const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .loose();

// Account deletion requires the current password as an explicit confirmation.
export const DeleteAccountSchema = z
  .object({
    password: z.string().min(1),
  })
  .loose();

// --- User upsert ----------------------------------------------------------

// Profile/goal updates from the client. The controller merges this into the
// stored record (preserving id/email/password server-side), so we only require
// the fields to be well-formed when present.
export const UserUpsertSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    profile: ProfileSchema.optional(),
  })
  .loose();

// --- Meals ----------------------------------------------------------------

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

// --- Weights --------------------------------------------------------------

export const WeightSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    date: z.union([z.string().min(1), z.date()]),
    weight: amount(1000),
    bmi: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .loose();

// --- Notifications & streaks (one row per user) ---------------------------

export const NotificationSchema = z
  .object({
    userId: z.string().min(1),
  })
  .loose();

export const StreakSchema = z
  .object({
    userId: z.string().min(1),
  })
  .loose();
