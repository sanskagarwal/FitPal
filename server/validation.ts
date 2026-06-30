import { z } from 'zod';
import { DietPreference, MealType, MealUnit, NutrientsSchema } from './domain.js';

// Request validation schemas (zod) for write routes, applied via `validateBody`.
// Schemas use `.loose()` so unknown fields pass through and the persisted shape
// is unchanged, while still guarding against malformed data (NaN/Infinity,
// negatives, absurd magnitudes, missing fields).

// A non-negative quantity with a generous upper bound. z.number() already
// rejects NaN/Infinity in Zod v4, so no .finite() is needed.
const amount = (max: number) => z.number().nonnegative().max(max);

// Reuse the canonical nutrient schema, layering numeric bounds on top so the
// field list lives in exactly one place (domain.ts).
const BoundedNutrients = NutrientsSchema.refine(
  (n) => Object.values(n).every((v) => Number.isFinite(v) && v >= 0 && v <= 1_000_000),
  { message: 'nutrient values must be finite, non-negative and within range' }
);

// Auth

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
    email: z.email(),
    password: z.string().min(8, 'password must be at least 8 characters'),
    profile: ProfileSchema,
  })
  .loose();

export const LoginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1),
  })
  .loose();

// Account deletion requires the current password as an explicit confirmation.
export const DeleteAccountSchema = z
  .object({
    password: z.string().min(1),
  })
  .loose();

// User upsert

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

// Meals

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

// A base64 image data URL for photo-based meal logging. This is a cheap
// boundary guard (allowed type + size bound to reject obvious abuse early); the
// authoritative decode/normalize lives in services/imageService.ts, which
// enforces the matching 3 MB decoded-bytes cap. The whole request body must fit
// the 5 MB express.json limit, and base64 inflates bytes by ~4/3, so 3 MB of
// image is ~4 MB of data-URL chars, leaving headroom for the other fields.
const MAX_IMAGE_DATAURL_CHARS = 4_300_000; // ~3 MB of image once base64-decoded
export const ImageDataUrlSchema = z
  .string()
  .max(MAX_IMAGE_DATAURL_CHARS, 'image is too large')
  .regex(/^data:image\/(jpeg|png|webp);base64,/i, 'image must be a jpeg, png or webp data URL');

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
    image: ImageDataUrlSchema.optional(),
  })
  .loose();

// Weights

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

// Date-range query for trend endpoints (recent N days of meals/weights). Both
// bounds are ISO 8601 strings; `end` must be on or after `start`.
const isoDateString = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'must be a valid date');

export const DateRangeQuerySchema = z
  .object({
    start: isoDateString,
    end: isoDateString,
  })
  .refine((q) => Date.parse(q.end) >= Date.parse(q.start), {
    message: 'end must be on or after start',
    path: ['end'],
  });

// Water intake (one cup per row)
export const WaterSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    date: z.iso.date(),
  })
  .loose();

// Single-date query for endpoints that filter by a specific local date.
export const DateQuerySchema = z.object({
  date: z.iso.date(),
});

// Notifications & streaks (one row per user)

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

// AI / images

// AI request schemas validate the SHAPE of each request (types, enums,
// required fields) so malformed input fails as a clean 400 at the boundary
// instead of surfacing as a confusing error deep in the AI service.

export const AnalyzeFoodSchema = z
  .object({
    foodQuery: z.string(),
  })
  .loose();

export const ReestimateUnitSchema = z
  .object({
    foodName: z.string(),
    unit: z.enum(MealUnit),
  })
  .loose();

export const RecipesRequestSchema = z
  .object({
    preferences: z.string().optional(),
    goals: z.string().optional(),
    recentFoods: z.array(z.string()).default([]),
    dietPreference: z.enum(DietPreference).optional(),
  })
  .loose();

export const InsightsRequestSchema = z
  .object({
    currentWeight: z.number(),
    targetWeight: z.number(),
    recentNutrition: z.object({}).loose().optional(),
    goals: z.string().optional(),
  })
  .loose();

export const SuggestMealRequestSchema = z
  .object({
    remainingCalories: z.number(),
    remainingProtein: z.number(),
    remainingCarbs: z.number(),
    remainingFats: z.number(),
    remainingFiber: z.number(),
    mealType: z.enum(MealType),
    dietPreference: z.enum(DietPreference).optional(),
    calorieCap: z.number().optional(),
  })
  .loose();

export const SuggestNutrientRequestSchema = z
  .object({
    nutrientName: z.string(),
    currentAmount: z.number(),
    targetAmount: z.number(),
  })
  .loose();

export const SuggestGoalsRequestSchema = z
  .object({
    height: z.number(),
    currentWeight: z.number(),
    age: z.number(),
    // Gender/activity are free-form strings on the profile.
    gender: z.string(),
    activityLevel: z.string(),
    targetWeight: z.number(),
  })
  .loose();

// Conversational meal-logging turns. Each entry's shape is owned by the AI
// service; default to empty arrays so controllers receive a guaranteed shape
// (no re-defaulting at the call site).
const ChatHistorySchema = z.array(z.object({}).loose()).default([]);
const LoggedMealsSchema = z.array(z.object({}).loose()).default([]);
const LocalTimeSchema = z.string().min(1).max(100);

export const ChatMealSchema = z
  .object({
    history: ChatHistorySchema,
    loggedMeals: LoggedMealsSchema,
    localTime: LocalTimeSchema,
  })
  .loose();

// Streaming meal-chat body. Only the optional image needs a content/size guard,
// handled by ImageDataUrlSchema (defined above, next to MealSchema).
export const ChatMealStreamSchema = z
  .object({
    history: ChatHistorySchema,
    loggedMeals: LoggedMealsSchema,
    localTime: LocalTimeSchema,
    image: ImageDataUrlSchema.optional(),
  })
  .loose();

// Per-meal insight request. The macro bundles are bounded; meal types are
// validated against the enum so the prompt only ever sees known meal labels.
const MealMacrosSchema = z.object({
  calories: amount(100000),
  protein: amount(100000),
  carbs: amount(100000),
  fats: amount(100000),
  fiber: amount(100000),
});

export const MealInsightRequestSchema = z
  .object({
    mealType: z.enum(MealType),
    consumed: MealMacrosSchema,
    target: MealMacrosSchema,
    laterMealTypes: z.array(z.enum(MealType)).default([]),
    dietPreference: z.string().optional(),
  })
  .loose();
