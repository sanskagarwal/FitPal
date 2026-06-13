import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { User } from '../../src/types';

// Controlled meals (two logged today) and weights (two entries, 2kg apart),
// hoisted so the db mock factory can use them.
const fixtures = vi.hoisted(() => {
  const today = new Date();
  const earlier = new Date(today.getTime() - 5 * 86_400_000);
  const nutrients = (calories: number, protein: number, carbs: number, fats: number) => ({
    calories,
    protein,
    carbs,
    fats,
  });
  return {
    meals: [
      { id: 'm1', userId: 'u1', date: today.toISOString(), totalNutrients: nutrients(500, 30, 60, 15) },
      { id: 'm2', userId: 'u1', date: today.toISOString(), totalNutrients: nutrients(700, 40, 80, 20) },
    ],
    weights: [
      { id: 'w-old', userId: 'u1', date: earlier.toISOString(), weight: 80, bmi: 24.7 },
      { id: 'w-new', userId: 'u1', date: today.toISOString(), weight: 78, bmi: 24.1 },
    ],
  };
});

vi.mock('../../src/utils/db', () => ({
  getMealsByDateRange: vi.fn(async () => fixtures.meals),
  getMealsByUser: vi.fn(async () => fixtures.meals),
  getWeightsByDateRange: vi.fn(async () => fixtures.weights),
  getWeightsByUser: vi.fn(async () => fixtures.weights),
}));

import { useTrendsData } from '../../src/components/dashboard/trends/useTrendsData';

const user = { id: 'u1' } as unknown as User;

describe('useTrendsData', () => {
  it('aggregates a 30-day window with one logged day', async () => {
    const { result } = renderHook(() => useTrendsData(user, 30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalDays).toBe(30);
    expect(result.current.daysLogged).toBe(1);
    expect(result.current.adherence).toBe(Math.round((1 / 30) * 100));

    // Today's bucket sums both meals.
    const todayBucket = result.current.days[result.current.days.length - 1];
    expect(todayBucket.calories).toBe(1200);
    expect(todayBucket.protein).toBe(70);
    expect(todayBucket.mealsLogged).toBe(2);
  });

  it('derives the weight series and net change over the range', async () => {
    const { result } = renderHook(() => useTrendsData(user, 30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.weightSeries).toHaveLength(2);
    expect(result.current.startWeight?.weight).toBe(80);
    expect(result.current.latestWeight?.weight).toBe(78);
    expect(result.current.weightChange).toBe(-2);
  });
});
