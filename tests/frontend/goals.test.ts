import { describe, it, expect } from 'vitest';
import {
  getGoalDirection,
  getWeeksToGoal,
  calculateMacroGoalsFromRate,
  calculateRegistrationGoals,
} from '../../src/utils/goals';
import { Gender, ActivityLevel, type UserProfile } from '../../src/types';

const profile: UserProfile = {
  dateOfBirth: '1996-06-05',
  gender: Gender.Male,
  height: 180,
  activityLevel: ActivityLevel.Moderate,
  goals: {
    targetWeight: 75,
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFats: 60,
    targetFiber: 30,
  },
};

describe('getGoalDirection', () => {
  it('detects loss, gain and maintain', () => {
    expect(getGoalDirection(80, 75)).toBe('loss');
    expect(getGoalDirection(70, 75)).toBe('gain');
    expect(getGoalDirection(75, 75)).toBe('maintain');
  });
});

describe('getWeeksToGoal', () => {
  it('returns null when not applicable', () => {
    expect(getWeeksToGoal(null, 75, 0.5, 'loss')).toBeNull();
    expect(getWeeksToGoal(80, 0, 0.5, 'loss')).toBeNull();
    expect(getWeeksToGoal(80, 75, 0.5, 'maintain')).toBeNull();
    expect(getWeeksToGoal(80, 75, 0, 'loss')).toBeNull();
  });

  it('rounds weeks up at the given weekly rate', () => {
    // |80 - 75| / 0.5 = 10 weeks
    expect(getWeeksToGoal(80, 75, 0.5, 'loss')).toBe(10);
    // |70 - 75| / 0.4 = 12.5 -> 13
    expect(getWeeksToGoal(70, 75, 0.4, 'gain')).toBe(13);
  });
});

describe('calculateMacroGoalsFromRate', () => {
  it('produces a deficit for weight loss', () => {
    const loss = calculateMacroGoalsFromRate(profile, 80, 75, 0.5);
    const maintain = calculateMacroGoalsFromRate(profile, 80, 80, 0.5);
    expect(loss.direction).toBe('loss');
    expect(loss.targetCalories).toBeLessThan(maintain.targetCalories);
  });

  it('produces a surplus for weight gain', () => {
    const gain = calculateMacroGoalsFromRate(profile, 70, 75, 0.5);
    const maintain = calculateMacroGoalsFromRate(profile, 70, 70, 0.5);
    expect(gain.direction).toBe('gain');
    expect(gain.targetCalories).toBeGreaterThan(maintain.targetCalories);
  });

  it('never drops below the safe calorie floor for males', () => {
    const extreme = calculateMacroGoalsFromRate(profile, 80, 60, 5);
    expect(extreme.targetCalories).toBeGreaterThanOrEqual(1500);
  });

  it('returns positive, coherent macro grams', () => {
    const goals = calculateMacroGoalsFromRate(profile, 80, 75, 0.5);
    expect(goals.targetProtein).toBeGreaterThan(0);
    expect(goals.targetCarbs).toBeGreaterThan(0);
    expect(goals.targetFats).toBeGreaterThan(0);
  });
});

describe('calculateRegistrationGoals', () => {
  it('computes maintenance calories and a standard macro split', () => {
    const goals = calculateRegistrationGoals('male', 180, 80, 30, 'moderate');
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; *1.55 = 2759
    expect(goals.maintenanceCalories).toBe(2759);
    expect(goals.protein).toBe(Math.round(80 * 1.6));
    expect(goals.fats).toBe(Math.round((2759 * 0.25) / 9));
    expect(goals.carbs).toBeGreaterThan(0);
  });

  it('falls back to a default activity multiplier for unknown levels', () => {
    const goals = calculateRegistrationGoals('female', 165, 60, 28, 'unknown-level');
    // multiplier defaults to 1.55
    expect(goals.maintenanceCalories).toBeGreaterThan(0);
  });
});
