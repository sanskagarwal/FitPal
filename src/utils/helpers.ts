// Simple hash function for password (for local storage only)
// In production, you'd use a proper crypto library
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  gender: 'male' | 'female' | 'other',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
): number => {
  let bmr: number;
  
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityMultipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very-active': 1.9
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

// Calculate streak
export const calculateStreak = (dates: Date[]): number => {
  if (dates.length === 0) return 0;
  
  const sortedDates = dates
    .map(d => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
  
  let streak = 1;
  const today = new Date().setHours(0, 0, 0, 0);
  
  if (sortedDates[0] !== today && sortedDates[0] !== today - 86400000) {
    return 0; // No recent activity
  }
  
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = sortedDates[i - 1] - sortedDates[i];
    if (diff === 86400000) { // 24 hours
      streak++;
    } else {
      break;
    }
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
