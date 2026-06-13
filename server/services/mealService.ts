import { mealRepository, type MealRecord } from '../repositories/mealRepository.js';
import { mealImageRepository, type MealImage } from '../repositories/mealImageRepository.js';
import { getDb } from '../db/database.js';
import { NotFoundError } from '../errors.js';

// A normalized meal photo to persist alongside the meal (already validated and
// re-encoded by the image service). Kept separate from the meal JSON.
export interface MealImageInput {
  mime: string;
  buffer: Buffer;
}

export const mealService = {
  // Create a meal, optionally storing a normalized photo in the same SQLite
  // transaction so the meal and its image are written atomically (or not at all).
  create(meal: MealRecord, image?: MealImageInput): MealRecord {
    getDb().transaction(() => {
      mealRepository.insert(meal);
      if (image) {
        mealImageRepository.upsert(meal.id, meal.userId, image.mime, image.buffer);
      }
    })();
    return meal;
  },

  listByUser(userId: string): MealRecord[] {
    return mealRepository.listByUser(userId);
  },

  listByUserInRange(userId: string, start: string, end: string): MealRecord[] {
    return mealRepository.listByUserInRange(userId, start, end);
  },

  // Fetch a meal's photo, scoped to its owner. Null when the meal has no image.
  getImage(mealId: string, userId: string): MealImage | null {
    return mealImageRepository.get(mealId, userId);
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
