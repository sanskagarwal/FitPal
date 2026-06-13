import { DailyStats } from '../types';

// Status tiers for the day's calorie progress, shared by the dashboard hero.
// Ordered from least to most calories consumed relative to the target.
export type DayStatusTone = 'start' | 'onTrack' | 'reached' | 'over';

export interface DayStatus {
  tone: DayStatusTone;
  message: string;
}

// Derive a short, encouraging status line from how the day's calories compare to
// the target. Returns null when there are no stats yet.
export const getDayStatus = (
  todayStats: DailyStats | null,
  targetCalories: number
): DayStatus | null => {
  if (!todayStats) return null;

  const caloriePercent =
    targetCalories > 0 ? (todayStats.totalCalories / targetCalories) * 100 : 0;

  if (caloriePercent > 120) {
    return {
      tone: 'over',
      message: `You're ${Math.round(caloriePercent - 100)}% over your calorie goal. Consider lighter meals for the rest of the day.`,
    };
  }
  if (caloriePercent > 100) {
    return {
      tone: 'reached',
      message: `You've reached your calorie goal. Great job tracking - keep it balanced.`,
    };
  }
  if (caloriePercent >= 80) {
    return {
      tone: 'onTrack',
      message: `You're on track with ${Math.round(100 - caloriePercent)}% of calories remaining. Keep going.`,
    };
  }
  return {
    tone: 'start',
    message: `Great start - you have plenty of room for nutritious meals today.`,
  };
};
