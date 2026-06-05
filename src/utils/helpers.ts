import { Gender, ActivityLevel } from '../types';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Basic email format validation (something@something.tld)
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// Calculate age in whole years from a date of birth (YYYY-MM-DD)
export const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

// BMI Calculation
export const calculateBMI = (weight: number, height: number): number => {
  // weight in kg, height in cm
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
};

// Calculate daily calorie needs using Mifflin-St Jeor Equation
export const calculateDailyCalories = (
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel
): number => {
  let bmr: number;
  
  if (gender === Gender.Male) {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityMultipliers: Record<ActivityLevel, number> = {
    [ActivityLevel.Sedentary]: 1.2,
    [ActivityLevel.Light]: 1.375,
    [ActivityLevel.Moderate]: 1.55,
    [ActivityLevel.Active]: 1.725,
    [ActivityLevel.VeryActive]: 1.9
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
};

// Calculate macro distribution (40% carbs, 30% protein, 30% fat)
export const calculateMacros = (totalCalories: number) => {
  return {
    protein: Math.round((totalCalories * 0.3) / 4), // 4 cal per gram
    carbs: Math.round((totalCalories * 0.4) / 4), // 4 cal per gram
    fats: Math.round((totalCalories * 0.3) / 9), // 9 cal per gram
  };
};

// Date utilities
export const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getEndOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getDaysInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// True when two dates fall on the same calendar day (local time).
export const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

// Format a Date as a local YYYY-MM-DD string for <input type="date"> (avoids UTC shift).
export const toDateInputValue = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse a YYYY-MM-DD string into a local Date at start of day.
export const parseDateInputValue = (value: string): Date => {
  return new Date(`${value}T00:00:00`);
};

// Apply the current wall-clock time to a given calendar day (used when logging
// meals on a day other than today so ordering/time context is preserved).
export const combineDateWithCurrentTime = (date: Date): Date => {
  const now = new Date();
  const result = new Date(date);
  result.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return result;
};

// Human-friendly label for a selected day, relative to today.
export const formatDayLabel = (date: Date): string => {
  const today = getStartOfDay(new Date());
  const target = getStartOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: today.getFullYear() === target.getFullYear() ? undefined : 'numeric',
  });
};

// Calculate streak
export const calculateStreak = (dates: Date[]): number => {
  if (dates.length === 0) return 0;

  // Work in calendar days, not raw millisecond offsets: a day is not always
  // 86_400_000 ms (DST transitions make it 23h or 25h), so timestamp math
  // would miscount streaks around those boundaries.
  const startOfDay = (d: Date): Date => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const loggedDays = new Set(dates.map((d) => dayKey(startOfDay(new Date(d)))));

  // A current streak must include today or yesterday; otherwise it's stale.
  const cursor = startOfDay(new Date());
  if (!loggedDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!loggedDays.has(dayKey(cursor))) return 0;
  }

  // Walk back one calendar day at a time. setDate() adjusts wall-clock time
  // correctly across DST and month/year boundaries.
  let streak = 0;
  while (loggedDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

// Format number with units
export const formatNutrient = (value: number | undefined, unit: string): string => {
  if (value === undefined) return 'N/A';
  return `${Math.round(value * 10) / 10}${unit}`;
};

// Percentage of goal
export const getGoalPercentage = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.round((current / target) * 100);
};
