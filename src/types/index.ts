// User Profile Types
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed locally
  createdAt: Date;
  profile: UserProfile;
}

export interface UserProfile {
  dateOfBirth: string; // ISO date string (YYYY-MM-DD)
  gender: 'male' | 'female' | 'other';
  height: number; // in cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  dietPreference?: 'vegetarian' | 'eggetarian' | 'non-vegetarian';
  goals: UserGoals;
}

export interface UserGoals {
  targetWeight: number; // in kg
  weightLossRate?: number; // kg per week (0.25, 0.5, 1)
  targetCalories: number;
  targetProtein: number; // in grams
  targetCarbs: number; // in grams
  targetFats: number; // in grams
  targetFiber: number; // in grams
  // Micronutrient targets
  targetVitaminA?: number; // mcg
  targetVitaminC?: number; // mg
  targetVitaminD?: number; // mcg
  targetVitaminE?: number; // mg
  targetVitaminB12?: number; // mcg
  targetCalcium?: number; // mg
  targetIron?: number; // mg
  targetMagnesium?: number; // mg
  targetPotassium?: number; // mg
  targetZinc?: number; // mg
  customNutrients?: {
    [key: string]: number; // e.g., 'fiber': 30, 'iron': 18
  };
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

export interface NutrientInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
  // Micronutrients
  vitaminA?: number; // mcg
  vitaminC?: number; // mg
  vitaminD?: number; // mcg
  vitaminE?: number; // mg
  vitaminB12?: number; // mcg
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  potassium?: number; // mg
  zinc?: number; // mg
}

// Meal Logging Types
export interface MealEntry {
  id: string;
  userId: string;
  date: Date;
  mealType: 'breakfast' | 'morning-snack' | 'lunch' | 'evening-snack' | 'dinner';
  foods: FoodEntry[];
  totalNutrients: NutrientInfo;
  notes?: string;
}

export interface FoodEntry {
  food: Food;
  quantity: number; // multiplier of serving size
  unit: 'serving' | 'katori' | 'bowl' | 'plate' | 'cup' | 'glass' | 'tbsp' | 'tsp' | 'piece' | 'slice' | 'gram' | 'ml' | 'oz';
  unitQuantity: number; // e.g., 1.5 cups
}

// Weight Tracking Types
export interface WeightEntry {
  id: string;
  userId: string;
  date: Date;
  weight: number; // kg
  bodyFat?: number; // percentage
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

// Azure OpenAI Types
export interface OpenAIRequest {
  prompt: string;
  context?: string;
}

export interface OpenAIResponse {
  message: string;
  data?: any;
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
