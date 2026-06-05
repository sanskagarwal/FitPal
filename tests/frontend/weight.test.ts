import { describe, it, expect } from 'vitest';
import { calculateGoalProgress } from '../../src/utils/weight';

describe('calculateGoalProgress', () => {
  it('returns null when data is missing', () => {
    expect(calculateGoalProgress(undefined, 80, 75)).toBeNull();
    expect(calculateGoalProgress(85, undefined, 75)).toBeNull();
    expect(calculateGoalProgress(85, 80, 0)).toBeNull();
  });

  it('returns 100 when start already equals target', () => {
    expect(calculateGoalProgress(75, 80, 75)).toBe(100);
  });

  it('computes partial progress toward a loss target', () => {
    // start 85, target 75 (distance 10); now 80 (remaining 5) -> 50%
    expect(calculateGoalProgress(85, 80, 75)).toBe(50);
  });

  it('computes partial progress toward a gain target', () => {
    // start 70, target 80 (distance 10); now 75 (remaining 5) -> 50%
    expect(calculateGoalProgress(70, 75, 80)).toBe(50);
  });

  it('reports 100 when the latest weight reaches the target', () => {
    expect(calculateGoalProgress(85, 75, 75)).toBe(100);
  });

  it('measures absolute distance, so overshooting reads as equidistant', () => {
    // start 85, target 75 (distance 10); now 70 is 5 past the target -> 50%
    expect(calculateGoalProgress(85, 70, 75)).toBe(50);
  });

  it('clamps to 0 when moving away from the target', () => {
    // start 85, target 75; now 90 (further than start) -> negative, clamped to 0
    expect(calculateGoalProgress(85, 90, 75)).toBe(0);
  });
});
