import { weightRepository, type WeightRecord } from '../repositories/weightRepository.js';
import { NotFoundError } from '../errors.js';

export const weightService = {
  create(weight: WeightRecord): WeightRecord {
    weightRepository.insert(weight);
    return weight;
  },

  listByUser(userId: string): WeightRecord[] {
    return weightRepository.listByUser(userId);
  },

  listByUserInRange(userId: string, start: string, end: string): WeightRecord[] {
    return weightRepository.listByUserInRange(userId, start, end);
  },

  update(id: string, userId: string, weight: WeightRecord): WeightRecord {
    const found = weightRepository.update(id, userId, weight);
    if (!found) {
      throw new NotFoundError('Weight');
    }
    return weight;
  },

  delete(id: string, userId: string): void {
    const found = weightRepository.delete(id, userId);
    if (!found) {
      throw new NotFoundError('Weight');
    }
  },
};
