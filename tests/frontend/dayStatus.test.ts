import { describe, it, expect } from 'vitest';
import { getDayStatus } from '../../src/utils/dayStatus';
import type { DailyStats } from '../../src/types';

const stats = (totalCalories: number): DailyStats => ({
  date: new Date(),
  totalCalories,
  totalProtein: 0,
  totalCarbs: 0,
  totalFats: 0,
  mealsLogged: 1,
});

describe('getDayStatus', () => {
  it('returns null when there are no stats', () => {
    expect(getDayStatus(null, 2000)).toBeNull();
  });

  it('flags a strong start when well under target (<80%)', () => {
    const status = getDayStatus(stats(1000), 2000); // 50%
    expect(status?.tone).toBe('start');
  });

  it('reports on-track between 80% and 100%', () => {
    const status = getDayStatus(stats(1800), 2000); // 90%
    expect(status?.tone).toBe('onTrack');
    expect(status?.message).toContain('10%');
  });

  it('marks the goal as reached just over 100%', () => {
    const status = getDayStatus(stats(2100), 2000); // 105%
    expect(status?.tone).toBe('reached');
  });

  it('warns when well over the goal (>120%)', () => {
    const status = getDayStatus(stats(2600), 2000); // 130%
    expect(status?.tone).toBe('over');
    expect(status?.message).toContain('30%');
  });

  it('treats a zero target as no progress (start)', () => {
    const status = getDayStatus(stats(500), 0);
    expect(status?.tone).toBe('start');
  });
});
