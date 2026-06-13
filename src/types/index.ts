// User Profile Types
//
// The string enums below are the contract with the server and persisted data.
// They are defined once in `server/shared/enums.ts` (a dependency-free module)
// and re-exported here so the frontend and backend can no longer drift apart.
import {
  DietPreference,
  Gender,
  ActivityLevel,
  MealType,
  MealUnit,
  MEAL_CALORIE_CAPS,
} from '../../server/shared/enums';

export { DietPreference, Gender, ActivityLevel, MealType, MealUnit, MEAL_CALORIE_CAPS };

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // bcrypt hash; server-only, never present on the client
  createdAt: Date;
  profile: UserProfile;
}

export interface UserProfile {
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  height: number; // cm
  activityLevel: ActivityLevel;
  dietPreference?: DietPreference;
  goals: UserGoals;
}

/**
 * Daily nutrition and weight targets. Weight in kg, energy in kcal, macros in
 * grams, vitamins/minerals in mg or mcg.
 */
export interface UserGoals {
  targetWeight: number;
  weightLossRate?: number; // kg per week (0.25, 0.5, 1)
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  targetFiber: number;
  targetVitaminA?: number;
  targetVitaminC?: number;
  targetVitaminD?: number;
  targetVitaminE?: number;
  targetVitaminB12?: number;
  targetCalcium?: number;
  targetIron?: number;
  targetMagnesium?: number;
  targetPotassium?: number;
  targetZinc?: number;
  customNutrients?: Record<string, number>;
}

/**
 * Recommended calorie + macro targets for a single meal type, derived by
 * splitting the user's daily goal across meals using the MEAL_CALORIE_CAPS
 * proportions. Energy in kcal, macros in grams.
 */
export interface MealTarget {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

// Food and Nutrition Types
export interface Food {
  id: string;
  name: string;
  servingSize: string;
  nutrients: NutrientInfo;
  isIndian: boolean;
  category?: string; // e.g., 'breakfast', 'snacks', 'dinner'
  confidence?: 'high' | 'medium' | 'low'; // AI's confidence in the nutrition values
}

/** Per-serving nutrients. Energy in kcal, macros in grams, micros in mg or mcg. */
export interface NutrientInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminB12?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  potassium?: number;
  zinc?: number;
}

// Meal Logging Types
export interface MealEntry {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  foods: FoodEntry[];
  totalNutrients: NutrientInfo;
  notes?: string;
  // True when a photo is stored for this meal (fetched lazily from the image
  // endpoint - the bytes are never inlined in the meal record).
  hasImage?: boolean;
  // Transient: a compressed photo data URL sent once on create. The server moves
  // it into the image store and strips it; it is never persisted on the meal.
  image?: string;
}

export interface FoodEntry {
  food: Food;
  quantity: number; // multiplier of serving size
  unit: MealUnit;
  unitQuantity: number; // e.g., 1.5 cups
}

// Weight Tracking Types
export interface WeightEntry {
  id: string;
  userId: string;
  date: Date;
  weight: number; // kg
  bodyFat?: number; // %
  bmi: number;
  notes?: string;
}

// Streak Tracking
export interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLogDate: Date;
}

// Notification Settings
export interface NotificationSettings {
  userId: string;
  enabled: boolean;
  breakfast?: string; // time in HH:mm format
  lunch?: string;
  dinner?: string;
  snack?: string;
}

// Recipe Type
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutrients: NutrientInfo;
  prepTime: string;
  servings: number;
}

// Dashboard Stats
export interface DailyStats {
  date: Date;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsLogged: number;
}

export interface WeeklyStats {
  weekStart: Date;
  dailyStats: DailyStats[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
}

// Export/Import Types
export interface ExportData {
  version: string;
  exportDate: Date;
  user: User;
  meals: MealEntry[];
  weightEntries: WeightEntry[];
  notifications: NotificationSettings;
}

// ---------------------------------------------------------------------------
// AI service types
//
// Shared shapes returned by the backend `/api/ai/*` routes. They live here (not
// in the AI client) so components and hooks can consume them without importing
// the service module.
// ---------------------------------------------------------------------------

export type InsightCategory =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fats'
  | 'fiber'
  | 'hydration'
  | 'general';

export interface InsightRecommendation {
  title: string;
  detail: string;
  category: InsightCategory;
}

export interface DietaryInsight {
  summary: string;
  recommendations: InsightRecommendation[];
}

export interface MealSuggestion {
  name: string;
  description: string;
  mealType: string;
  ingredients: { item: string; portion: string }[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number; fiber: number };
  reason: string;
}

export type MealInsightNutrient = 'calories' | 'protein' | 'carbs' | 'fats' | 'fiber';

export interface MealInsightShortfall {
  nutrient: MealInsightNutrient;
  note: string;
}

export interface MealInsightMakeUp {
  mealType: string;
  suggestion: string;
}

// AI insight for a single logged meal: how it did against its target, what it
// lacked, how to improve the meal itself, and how to make up gaps in later meals.
export interface MealInsight {
  assessment: string;
  shortfalls: MealInsightShortfall[];
  improveThisMeal: string[];
  makeUp: MealInsightMakeUp[];
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

// Agentic, conversational meal logging.
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
  // Normalized photo (data URL) echoed back by the server when the meal was
  // logged from a picture, so it can be persisted on confirm.
  image?: string;
}

// Compact summary of an already-logged meal, given to the assistant so it can
// reference, edit or delete existing meals by id.
export interface LoggedMealSummary {
  id: string;
  mealType: string;
  time?: string | null; // HH:mm if known
  foods: { name: string; unitQuantity: number; unit: string }[];
}

// A single turn in the meal-logging chat.
export interface MealChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
