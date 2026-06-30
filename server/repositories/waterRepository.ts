import { JsonCollectionRepository } from '../db/repository.js';

export interface WaterRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD local date
}

export const waterRepository = new JsonCollectionRepository<WaterRecord>('water_intake');
