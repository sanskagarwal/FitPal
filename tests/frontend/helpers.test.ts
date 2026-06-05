import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isValidEmail,
  calculateAge,
  calculateBMI,
  calculateDailyCalories,
  calculateMacros,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getDaysInRange,
  isSameDay,
  toDateInputValue,
  parseDateInputValue,
  formatDayLabel,
  calculateStreak,
  formatNutrient,
  getGoalPercentage,
  generateId,
} from '../../src/utils/helpers';
import { Gender, ActivityLevel } from '../../src/types';

describe('generateId', () => {
  it('returns a non-empty unique-ish string', () => {
    const a = generateId();
    const b = generateId();
    expect(a).toBeTypeOf('string');
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  trimmed@domain.co  ')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.io')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('two@@at.com')).toBe(false);
    expect(isValidEmail('space in@email.com')).toBe(false);
  });
});

describe('calculateAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty or invalid input', () => {
    expect(calculateAge('')).toBe(0);
    expect(calculateAge('not-a-date')).toBe(0);
  });

  it('computes whole years, accounting for birthday not yet reached', () => {
    expect(calculateAge('2000-06-05')).toBe(26); // birthday today
    expect(calculateAge('2000-06-06')).toBe(25); // birthday tomorrow
    expect(calculateAge('2000-01-01')).toBe(26); // birthday passed
  });
});

describe('calculateBMI', () => {
  it('computes BMI rounded to one decimal', () => {
    // 70kg, 175cm -> 22.857 -> 22.9
    expect(calculateBMI(70, 175)).toBe(22.9);
    // 60kg, 160cm -> 23.4375 -> 23.4
    expect(calculateBMI(60, 160)).toBe(23.4);
  });
});

describe('calculateDailyCalories (Mifflin-St Jeor)', () => {
  it('computes for a male, sedentary', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; *1.2 = 2136
    expect(calculateDailyCalories(80, 180, 30, Gender.Male, ActivityLevel.Sedentary)).toBe(2136);
  });

  it('computes for a female, moderate', () => {
    // BMR = 10*60 + 6.25*165 - 5*28 - 161 = 1330.25; *1.55 = 2061.8875 -> 2062
    expect(calculateDailyCalories(60, 165, 28, Gender.Female, ActivityLevel.Moderate)).toBe(2062);
  });
});

describe('calculateMacros', () => {
  it('splits calories 30/40/30 into grams', () => {
    expect(calculateMacros(2000)).toEqual({ protein: 150, carbs: 200, fats: 67 });
  });
});

describe('date helpers', () => {
  it('getStartOfDay zeroes the time', () => {
    const d = getStartOfDay(new Date('2026-06-05T15:42:11.500'));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('getEndOfDay sets time to end of day', () => {
    const d = getEndOfDay(new Date('2026-06-05T01:00:00'));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });

  it('getStartOfWeek returns the preceding Sunday at midnight', () => {
    // 2026-06-05 is a Friday; start of week (Sunday) is 2026-05-31
    const d = getStartOfWeek(new Date('2026-06-05T10:00:00'));
    expect(d.getDay()).toBe(0);
    expect(toDateInputValue(d)).toBe('2026-05-31');
  });

  it('getDaysInRange is inclusive of both ends', () => {
    const days = getDaysInRange(new Date('2026-06-01T00:00:00'), new Date('2026-06-03T00:00:00'));
    expect(days).toHaveLength(3);
    expect(days.map(toDateInputValue)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('isSameDay compares calendar day ignoring time', () => {
    expect(isSameDay(new Date('2026-06-05T01:00:00'), new Date('2026-06-05T23:00:00'))).toBe(true);
    expect(isSameDay(new Date('2026-06-05T23:00:00'), new Date('2026-06-06T00:00:00'))).toBe(false);
  });

  it('toDateInputValue / parseDateInputValue round-trip without UTC shift', () => {
    const value = '2026-06-05';
    const parsed = parseDateInputValue(value);
    expect(parsed.getHours()).toBe(0);
    expect(toDateInputValue(parsed)).toBe(value);
  });
});

describe('formatDayLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels today, yesterday and tomorrow', () => {
    expect(formatDayLabel(new Date('2026-06-05T08:00:00'))).toBe('Today');
    expect(formatDayLabel(new Date('2026-06-04T08:00:00'))).toBe('Yesterday');
    expect(formatDayLabel(new Date('2026-06-06T08:00:00'))).toBe('Tomorrow');
  });

  it('labels other days with a formatted date', () => {
    const label = formatDayLabel(new Date('2026-06-01T08:00:00'));
    expect(label).not.toBe('Today');
    expect(label).toMatch(/Jun/);
  });
});

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for no dates', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const dates = [
      new Date('2026-06-05T09:00:00'),
      new Date('2026-06-04T09:00:00'),
      new Date('2026-06-03T09:00:00'),
    ];
    expect(calculateStreak(dates)).toBe(3);
  });

  it('counts a streak ending yesterday', () => {
    const dates = [new Date('2026-06-04T09:00:00'), new Date('2026-06-03T09:00:00')];
    expect(calculateStreak(dates)).toBe(2);
  });

  it('returns 0 when the most recent log is stale (older than yesterday)', () => {
    const dates = [new Date('2026-06-01T09:00:00'), new Date('2026-05-31T09:00:00')];
    expect(calculateStreak(dates)).toBe(0);
  });

  it('ignores duplicate logs on the same day', () => {
    const dates = [
      new Date('2026-06-05T09:00:00'),
      new Date('2026-06-05T18:00:00'),
      new Date('2026-06-04T09:00:00'),
    ];
    expect(calculateStreak(dates)).toBe(2);
  });
});

describe('formatNutrient', () => {
  it('returns N/A for undefined', () => {
    expect(formatNutrient(undefined, 'g')).toBe('N/A');
  });

  it('rounds to one decimal and appends the unit', () => {
    expect(formatNutrient(12.345, 'g')).toBe('12.3g');
    expect(formatNutrient(100, 'mg')).toBe('100mg');
  });
});

describe('getGoalPercentage', () => {
  it('returns 0 when the target is 0', () => {
    expect(getGoalPercentage(50, 0)).toBe(0);
  });

  it('computes a rounded percentage', () => {
    expect(getGoalPercentage(50, 200)).toBe(25);
    expect(getGoalPercentage(1, 3)).toBe(33);
  });
});
