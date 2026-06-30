import { waterRepository, type WaterRecord } from '../repositories/waterRepository.js';
import { NotFoundError } from '../errors.js';

export const waterService = {
  create(entry: WaterRecord): WaterRecord {
    waterRepository.insert(entry);
    return entry;
  },

  // Returns all cup entries for a user on the given local date (YYYY-MM-DD).
  // BETWEEN on identical strings is an exact-match for date-only values.
  listByDate(userId: string, date: string): WaterRecord[] {
    return waterRepository.listByUserInRange(userId, date, date);
  },

  delete(id: string, userId: string): void {
    const found = waterRepository.delete(id, userId);
    if (!found) {
      throw new NotFoundError('Water entry');
    }
  },
};
