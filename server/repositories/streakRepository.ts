import { JsonSingletonRepository } from '../db/repository.js';

export interface StreakRecord {
  userId: string;
  [key: string]: unknown;
}

export const streakRepository = new JsonSingletonRepository<StreakRecord>('streaks');
