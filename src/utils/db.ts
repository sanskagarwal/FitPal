import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { User, MealEntry, WeightEntry, NotificationSettings, Streak } from '../types';

interface FitPalDB extends DBSchema {
  users: {
    key: string;
    value: User;
  };
  meals: {
    key: string;
    value: MealEntry;
    indexes: { 'by-user': string; 'by-date': Date };
  };
  weights: {
    key: string;
    value: WeightEntry;
    indexes: { 'by-user': string; 'by-date': Date };
  };
  notifications: {
    key: string;
    value: NotificationSettings;
  };
  streaks: {
    key: string;
    value: Streak;
  };
}

const DB_NAME = 'fitpal-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FitPalDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<FitPalDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FitPalDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      // Meals store with indexes
      if (!db.objectStoreNames.contains('meals')) {
        const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealStore.createIndex('by-user', 'userId');
        mealStore.createIndex('by-date', 'date');
      }

      // Weights store with indexes
      if (!db.objectStoreNames.contains('weights')) {
        const weightStore = db.createObjectStore('weights', { keyPath: 'id' });
        weightStore.createIndex('by-user', 'userId');
        weightStore.createIndex('by-date', 'date');
      }

      // Notifications store
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'userId' });
      }

      // Streaks store
      if (!db.objectStoreNames.contains('streaks')) {
        db.createObjectStore('streaks', { keyPath: 'userId' });
      }
    },
  });

  return dbInstance;
};

// User operations
export const saveUser = async (user: User): Promise<void> => {
  const db = await initDB();
  await db.put('users', user);
};

export const getUser = async (id: string): Promise<User | undefined> => {
  const db = await initDB();
  return await db.get('users', id);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const db = await initDB();
  const users = await db.getAll('users');
  return users.find(user => user.email === email);
};

export const getAllUsers = async (): Promise<User[]> => {
  const db = await initDB();
  return await db.getAll('users');
};

// Meal operations
export const saveMeal = async (meal: MealEntry): Promise<void> => {
  const db = await initDB();
  await db.put('meals', meal);
};

export const getMeal = async (id: string): Promise<MealEntry | undefined> => {
  const db = await initDB();
  return await db.get('meals', id);
};

export const getMealsByUser = async (userId: string): Promise<MealEntry[]> => {
  const db = await initDB();
  return await db.getAllFromIndex('meals', 'by-user', userId);
};

export const getMealsByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MealEntry[]> => {
  const db = await initDB();
  const meals = await db.getAllFromIndex('meals', 'by-user', userId);
  return meals.filter(meal => {
    const mealDate = new Date(meal.date);
    return mealDate >= startDate && mealDate <= endDate;
  });
};

export const deleteMeal = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('meals', id);
};

// Weight operations
export const saveWeight = async (weight: WeightEntry): Promise<void> => {
  const db = await initDB();
  await db.put('weights', weight);
};

export const getWeightsByUser = async (userId: string): Promise<WeightEntry[]> => {
  const db = await initDB();
  const weights = await db.getAllFromIndex('weights', 'by-user', userId);
  return weights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deleteWeight = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('weights', id);
};

// Notification operations
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  const db = await initDB();
  await db.put('notifications', settings);
};

export const getNotificationSettings = async (userId: string): Promise<NotificationSettings | undefined> => {
  const db = await initDB();
  return await db.get('notifications', userId);
};

// Streak operations
export const saveStreak = async (streak: Streak): Promise<void> => {
  const db = await initDB();
  await db.put('streaks', streak);
};

export const getStreak = async (userId: string): Promise<Streak | undefined> => {
  const db = await initDB();
  return await db.get('streaks', userId);
};

// Clear all data (for logout/reset)
export const clearAllData = async (): Promise<void> => {
  const db = await initDB();
  await db.clear('users');
  await db.clear('meals');
  await db.clear('weights');
  await db.clear('notifications');
  await db.clear('streaks');
};
