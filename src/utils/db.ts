import { User, MealEntry, WeightEntry, NotificationSettings, Streak } from '../types';
import { DataSource } from '../services/data/types';
import { remoteDataSource } from '../services/data/remoteDataSource';
import { API_BASE_URL } from '../services/data/apiClient';

// Re-exported so existing imports (`import { ApiError } from '../utils/db'`)
// keep working now that the low-level REST client lives in services/data.
export { ApiError } from '../services/data/apiClient';

// Active storage backend. The web build uses the REST-backed remote source.
// Phase 1 adds a local SQLite-backed source selected via a platform check.
const backend: DataSource = remoteDataSource;

// ---------------------------------------------------------------------------
// Auth operations. The server hashes passwords (bcrypt) and issues a session
// JWT in an httpOnly cookie, so the browser never sees password hashes or
// handles tokens directly.
// ---------------------------------------------------------------------------
export interface AuthResult {
  ok: boolean;
  status: number;
  user?: User;
  code?: string;
  error?: string;
}

async function authRequest(endpoint: string, body?: unknown): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: { user?: User; code?: string; error?: string } | null = null;
    try {
      data = await response.json();
    } catch {
      // No/invalid JSON body - leave data null.
    }
    return {
      ok: response.ok,
      status: response.status,
      user: data?.user,
      code: data?.code,
      error: data?.error,
    };
  } catch {
    return { ok: false, status: 0, error: 'Network error' };
  }
}

export const authRegister = (payload: {
  name: string;
  email: string;
  password: string;
  profile: User['profile'];
}): Promise<AuthResult> => authRequest('register', payload);

export const authLogin = (email: string, password: string): Promise<AuthResult> =>
  authRequest('login', { email, password });

export const authLogout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // Best-effort; the client clears its own state regardless.
  }
};

export const authMe = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

// Permanently delete the signed-in user's account and all their data. Requires
// the current password as a confirmation; the server clears the auth cookie.
export const authDeleteAccount = async (password: string): Promise<AuthResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    let data: { error?: string } | null = null;
    try {
      data = await response.json();
    } catch {
      // No/invalid JSON body - leave data null.
    }
    return { ok: response.ok, status: response.status, error: data?.error };
  } catch {
    return { ok: false, status: 0, error: 'Network error' };
  }
};

// ---------------------------------------------------------------------------
// Data operations. These delegate to the active storage backend so the rest of
// the app imports the same names regardless of platform (web REST vs local).
// ---------------------------------------------------------------------------

// User operations
export const saveUser = (user: User): Promise<void> => backend.saveUser(user);

export const getUser = (id: string): Promise<User | undefined> => backend.getUser(id);

export const updateUser = (user: User): Promise<void> => backend.updateUser(user);

// Meal operations
export const saveMeal = (meal: MealEntry): Promise<void> => backend.saveMeal(meal);

export const getMeal = (id: string, userId: string): Promise<MealEntry | undefined> =>
  backend.getMeal(id, userId);

export const getMealsByUser = (userId: string): Promise<MealEntry[]> =>
  backend.getMealsByUser(userId);

export const getMealsByDateRange = (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MealEntry[]> => backend.getMealsByDateRange(userId, startDate, endDate);

export const updateMeal = (meal: MealEntry): Promise<void> => backend.updateMeal(meal);

export const deleteMeal = (id: string, userId: string): Promise<void> =>
  backend.deleteMeal(id, userId);

export const getMealImageUrl = (userId: string, mealId: string): string =>
  backend.getMealImageUrl(userId, mealId);

// Weight operations
export const saveWeight = (weight: WeightEntry): Promise<void> => backend.saveWeight(weight);

export const getWeightsByUser = (userId: string): Promise<WeightEntry[]> =>
  backend.getWeightsByUser(userId);

export const getWeightsByDateRange = (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WeightEntry[]> => backend.getWeightsByDateRange(userId, startDate, endDate);

export const updateWeight = (weight: WeightEntry): Promise<void> => backend.updateWeight(weight);

export const deleteWeight = (id: string, userId: string): Promise<void> =>
  backend.deleteWeight(id, userId);

// Notification operations
export const saveNotificationSettings = (settings: NotificationSettings): Promise<void> =>
  backend.saveNotificationSettings(settings);

export const getNotificationSettings = (
  userId: string
): Promise<NotificationSettings | undefined> => backend.getNotificationSettings(userId);

// Streak operations
export const saveStreak = (streak: Streak): Promise<void> => backend.saveStreak(streak);

export const getStreak = (userId: string): Promise<Streak | undefined> =>
  backend.getStreak(userId);
