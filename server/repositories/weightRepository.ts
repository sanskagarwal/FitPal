import { JsonCollectionRepository } from '../db/repository.js';

export interface WeightRecord {
  id: string;
  userId: string;
  [key: string]: unknown;
}

export const weightRepository = new JsonCollectionRepository<WeightRecord>('weights');
