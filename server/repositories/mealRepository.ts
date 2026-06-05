import { JsonCollectionRepository } from '../db/repository.js';

export interface MealRecord {
  id: string;
  userId: string;
  [key: string]: unknown;
}

export const mealRepository = new JsonCollectionRepository<MealRecord>('meals');
