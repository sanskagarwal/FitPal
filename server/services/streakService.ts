import { streakRepository, type StreakRecord } from '../repositories/streakRepository.js';

export const streakService = {
  save(streak: StreakRecord): StreakRecord {
    streakRepository.upsert(streak);
    return streak;
  },

  get(userId: string): StreakRecord | null {
    return streakRepository.get(userId);
  },
};
