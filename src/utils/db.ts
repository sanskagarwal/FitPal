import { User, MealEntry, WeightEntry, NotificationSettings, Streak } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function for API calls
async function apiCall(endpoint: string, method: string = 'GET', body?: unknown) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return await response.json();
}

// User operations
export const saveUser = async (user: User): Promise<void> => {
  await apiCall(`/users`, 'POST', user);
};

export const getUser = async (id: string): Promise<User | undefined> => {
  try {
    return await apiCall(`/users/${id}`);
  } catch (error) {
    console.error(`Failed to get user ${id}:`, error);
    return undefined;
  }
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    return await apiCall(`/users/email/${encodeURIComponent(email)}`);
  } catch (error) {
    console.error(`Failed to get user by email ${email}:`, error);
    return undefined;
  }
};

export const updateUser = async (user: User): Promise<void> => {
  await apiCall(`/users/${user.id}`, 'PUT', user);
};

// Meal operations
export const saveMeal = async (meal: MealEntry): Promise<void> => {
  await apiCall(`/meals`, 'POST', meal);
};

export const getMeal = async (id: string, userId: string): Promise<MealEntry | undefined> => {
  try {
    const meals = await getMealsByUser(userId);
    return meals.find(m => m.id === id);
  } catch (error) {
    console.error(`Failed to get meal ${id} for user ${userId}:`, error);
    return undefined;
  }
};

export const getMealsByUser = async (userId: string): Promise<MealEntry[]> => {
  try {
    return await apiCall(`/meals/${userId}`);
  } catch (error) {
    console.error(`Failed to get meals for user ${userId}:`, error);
    return [];
  }
};

export const getMealsByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MealEntry[]> => {
  const meals = await getMealsByUser(userId);
  return meals.filter(meal => {
    const mealDate = new Date(meal.date);
    return mealDate >= startDate && mealDate <= endDate;
  });
};

export const updateMeal = async (meal: MealEntry): Promise<void> => {
  await apiCall(`/meals/${meal.id}`, 'PUT', meal);
};

export const deleteMeal = async (id: string, userId: string): Promise<void> => {
  await apiCall(`/meals/${userId}/${id}`, 'DELETE');
};

// Weight operations
export const saveWeight = async (weight: WeightEntry): Promise<void> => {
  await apiCall(`/weights`, 'POST', weight);
};

export const getWeightsByUser = async (userId: string): Promise<WeightEntry[]> => {
  try {
    const weights = await apiCall(`/weights/${userId}`);
    return weights.sort((a: WeightEntry, b: WeightEntry) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error(`Failed to get weights for user ${userId}:`, error);
    return [];
  }
};

export const updateWeight = async (weight: WeightEntry): Promise<void> => {
  await apiCall(`/weights/${weight.id}`, 'PUT', weight);
};

export const deleteWeight = async (id: string, userId: string): Promise<void> => {
  await apiCall(`/weights/${userId}/${id}`, 'DELETE');
};

// Notification operations
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  await apiCall(`/notifications`, 'POST', settings);
};

export const getNotificationSettings = async (userId: string): Promise<NotificationSettings | undefined> => {
  try {
    return await apiCall(`/notifications/${userId}`);
  } catch (error) {
    console.error(`Failed to get notification settings for user ${userId}:`, error);
    return undefined;
  }
};

// Streak operations
export const saveStreak = async (streak: Streak): Promise<void> => {
  await apiCall(`/streaks`, 'POST', streak);
};

export const getStreak = async (userId: string): Promise<Streak | undefined> => {
  try {
    return await apiCall(`/streaks/${userId}`);
  } catch (error) {
    console.error(`Failed to get streak for user ${userId}:`, error);
    return undefined;
  }
};

// Legacy compatibility - keep these functions but they now do nothing
export const initDB = async (): Promise<unknown> => {
  // No-op for server-based storage
  return null;
};

export const clearAllData = async (): Promise<void> => {
  // No-op - data is on server
  console.warn('clearAllData is not supported with server-based storage');
};

export const getAllUsers = async (): Promise<User[]> => {
  // Not exposed in server API for security
  console.warn('getAllUsers is not supported with server-based storage');
  return [];
};
