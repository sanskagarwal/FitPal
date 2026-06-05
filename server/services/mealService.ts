import { mealRepository, type MealRecord } from '../repositories/mealRepository.js';
import { NotFoundError } from '../errors.js';

export const mealService = {
  create(meal: MealRecord): MealRecord {
    mealRepository.insert(meal);
    return meal;
  },

  listByUser(userId: string): MealRecord[] {
    return mealRepository.listByUser(userId);
  },

  update(id: string, userId: string, meal: MealRecord): MealRecord {
    const found = mealRepository.update(id, userId, meal);
    if (!found) {
      throw new NotFoundError('Meal');
    }
    return meal;
  },

  delete(id: string, userId: string): void {
    const found = mealRepository.delete(id, userId);
    if (!found) {
      throw new NotFoundError('Meal');
    }
  },
};
