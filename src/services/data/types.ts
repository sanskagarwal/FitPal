import { User, MealEntry, WeightEntry, NotificationSettings, Streak } from '../../types';

// Storage backend abstraction. The web build uses a REST-backed implementation
// (RemoteDataSource); the Android build will provide a local SQLite-backed
// implementation. The frontend talks to storage only through src/utils/db.ts,
// which delegates to whichever DataSource is active for the current platform.
export interface DataSource {
  // User
  saveUser(user: User): Promise<void>;
  getUser(id: string): Promise<User | undefined>;
  updateUser(user: User): Promise<void>;

  // Meals
  saveMeal(meal: MealEntry): Promise<void>;
  getMeal(id: string, userId: string): Promise<MealEntry | undefined>;
  getMealsByUser(userId: string): Promise<MealEntry[]>;
  getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MealEntry[]>;
  updateMeal(meal: MealEntry): Promise<void>;
  deleteMeal(id: string, userId: string): Promise<void>;
  getMealImageUrl(userId: string, mealId: string): string;

  // Weights
  saveWeight(weight: WeightEntry): Promise<void>;
  getWeightsByUser(userId: string): Promise<WeightEntry[]>;
  getWeightsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<WeightEntry[]>;
  updateWeight(weight: WeightEntry): Promise<void>;
  deleteWeight(id: string, userId: string): Promise<void>;

  // Notifications
  saveNotificationSettings(settings: NotificationSettings): Promise<void>;
  getNotificationSettings(userId: string): Promise<NotificationSettings | undefined>;

  // Streaks
  saveStreak(streak: Streak): Promise<void>;
  getStreak(userId: string): Promise<Streak | undefined>;
}
