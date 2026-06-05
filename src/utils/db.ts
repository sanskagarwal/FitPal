import { User, MealEntry, WeightEntry, NotificationSettings, Streak } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// A failed API call. Carries the HTTP status and the server-provided error
// message (when present) so callers can distinguish error kinds and surface a
// meaningful message instead of a generic "API call failed".
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Read the server's error message from a non-OK response body, falling back to
// the status text. Mirrors the auth/AI clients so error handling is uniform.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) return data.error;
  } catch {
    // No/invalid JSON body — fall through to the status text.
  }
  return response.statusText || 'Request failed';
}

// Helper function for API calls. `credentials: 'include'` sends the httpOnly
// auth cookie so the server can authenticate the request and enforce ownership.
async function apiCall(endpoint: string, method: string = 'GET', body?: unknown) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status, endpoint);
  }

  return await response.json();
}

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
      // No/invalid JSON body — leave data null.
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
