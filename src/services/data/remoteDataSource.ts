import { WeightEntry } from '../../types';
import { DataSource } from './types';
import { API_BASE_URL, apiCall } from './apiClient';

// REST-backed data source used by the web build. Each method preserves the
// exact behavior the app relied on when these functions lived directly in
// src/utils/db.ts (including error logging and the empty/undefined fallbacks).
export const remoteDataSource: DataSource = {
  // User operations
  async saveUser(user) {
    await apiCall(`/users`, 'POST', user);
  },

  async getUser(id) {
    try {
      return await apiCall(`/users/${id}`);
    } catch (error) {
      console.error(`Failed to get user ${id}:`, error);
      return undefined;
    }
  },

  async updateUser(user) {
    await apiCall(`/users/${user.id}`, 'PUT', user);
  },

  // Meal operations
  async saveMeal(meal) {
    await apiCall(`/meals`, 'POST', meal);
  },

  async getMeal(id, userId) {
    try {
      const meals = await this.getMealsByUser(userId);
      return meals.find((m) => m.id === id);
    } catch (error) {
      console.error(`Failed to get meal ${id} for user ${userId}:`, error);
      return undefined;
    }
  },

  async getMealsByUser(userId) {
    try {
      return await apiCall(`/meals/${userId}`);
    } catch (error) {
      console.error(`Failed to get meals for user ${userId}:`, error);
      return [];
    }
  },

  async getMealsByDateRange(userId, startDate, endDate) {
    try {
      const query = `start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(
        endDate.toISOString()
      )}`;
      return await apiCall(`/meals/${userId}/range?${query}`);
    } catch (error) {
      console.error(`Failed to get meals in range for user ${userId}:`, error);
      return [];
    }
  },

  async updateMeal(meal) {
    await apiCall(`/meals/${meal.id}`, 'PUT', meal);
  },

  async deleteMeal(id, userId) {
    await apiCall(`/meals/${userId}/${id}`, 'DELETE');
  },

  // URL of a meal's stored photo. The browser fetches it lazily (with the auth
  // cookie) only when an <img> using this src is rendered.
  getMealImageUrl(userId, mealId) {
    return `${API_BASE_URL}/meals/${userId}/${mealId}/image`;
  },

  // Weight operations
  async saveWeight(weight) {
    await apiCall(`/weights`, 'POST', weight);
  },

  async getWeightsByUser(userId) {
    try {
      const weights = await apiCall(`/weights/${userId}`);
      return weights.sort(
        (a: WeightEntry, b: WeightEntry) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error(`Failed to get weights for user ${userId}:`, error);
      return [];
    }
  },

  async getWeightsByDateRange(userId, startDate, endDate) {
    try {
      const query = `start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(
        endDate.toISOString()
      )}`;
      const weights = await apiCall(`/weights/${userId}/range?${query}`);
      return weights.sort(
        (a: WeightEntry, b: WeightEntry) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error(`Failed to get weights in range for user ${userId}:`, error);
      return [];
    }
  },

  async updateWeight(weight) {
    await apiCall(`/weights/${weight.id}`, 'PUT', weight);
  },

  async deleteWeight(id, userId) {
    await apiCall(`/weights/${userId}/${id}`, 'DELETE');
  },

  // Notification operations
  async saveNotificationSettings(settings) {
    await apiCall(`/notifications`, 'POST', settings);
  },

  async getNotificationSettings(userId) {
    try {
      return await apiCall(`/notifications/${userId}`);
    } catch (error) {
      console.error(`Failed to get notification settings for user ${userId}:`, error);
      return undefined;
    }
  },

  // Streak operations
  async saveStreak(streak) {
    await apiCall(`/streaks`, 'POST', streak);
  },

  async getStreak(userId) {
    try {
      return await apiCall(`/streaks/${userId}`);
    } catch (error) {
      console.error(`Failed to get streak for user ${userId}:`, error);
      return undefined;
    }
  },
};
