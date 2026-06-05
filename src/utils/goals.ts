import { UserProfile } from '../types';
import { calculateAge } from './helpers';

export type GoalDirection = 'loss' | 'gain' | 'maintain';

export interface CalculatedMacroGoals {
  direction: GoalDirection;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
}

// Direction of the goal based on target vs. current weight.
export const getGoalDirection = (currentWeight: number, targetWeight: number): GoalDirection =>
  targetWeight < currentWeight ? 'loss' : targetWeight > currentWeight ? 'gain' : 'maintain';

// Mifflin-St Jeor BMR.
const calculateBmr = (gender: string, weight: number, height: number, age: number): number =>
  gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

// Rough estimate of how long the goal will take, in whole weeks, at the chosen
// rate. Returns null when it doesn't apply (no current weight, maintenance, or
// non-positive rate).
export const getWeeksToGoal = (
  currentWeight: number | null,
  targetWeight: number,
  rate: number,
  direction: GoalDirection
): number | null => {
  if (currentWeight === null || targetWeight <= 0 || direction === 'maintain' || rate <= 0) {
    return null;
  }
  return Math.ceil(Math.abs(currentWeight - targetWeight) / rate);
};

// Derive daily calorie + macro targets from the desired weekly rate of change,
// using the user's profile (BMR × activity factor) and a 7700 kcal/kg model.
export const calculateMacroGoalsFromRate = (
  profile: UserProfile,
  currentWeight: number,
  targetWeight: number,
  weightLossRate: number
): CalculatedMacroGoals => {
  const direction = getGoalDirection(currentWeight, targetWeight);

  // ~7700 kcal per kg of body weight. For maintenance there is no daily
  // adjustment; otherwise it's a deficit (loss) or surplus (gain).
  const dailyAdjustment = direction === 'maintain' ? 0 : (weightLossRate * 7700) / 7;

  const age = calculateAge(profile.dateOfBirth);
  const bmr = calculateBmr(profile.gender, currentWeight, profile.height, age);
  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.5;

  const maintenanceCalories = bmr * activityMultiplier;
  const rawTarget =
    direction === 'gain'
      ? maintenanceCalories + dailyAdjustment
      : maintenanceCalories - dailyAdjustment;

  // Don't drop below a safe floor when losing weight.
  const minCalories = profile.gender === 'male' ? 1500 : 1200;
  const targetCalories = Math.round(Math.max(minCalories, rawTarget));

  // Higher protein helps preserve muscle in a deficit and build it in a surplus.
  const protein = Math.round(currentWeight * 1.8);
  const fats = Math.round((targetCalories * 0.25) / 9);
  const carbs = Math.round((targetCalories - protein * 4 - fats * 9) / 4);

  return {
    direction,
    targetCalories,
    targetProtein: protein,
    targetCarbs: carbs,
    targetFats: fats,
  };
};

export interface RegistrationGoals {
  maintenanceCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// Default daily targets at registration: maintenance calories (BMR × activity)
// with a standard macro split (1.6 g/kg protein, 25% fats, remainder carbs).
export const calculateRegistrationGoals = (
  gender: string,
  height: number,
  weight: number,
  age: number,
  activityLevel: string
): RegistrationGoals => {
  const bmr = calculateBmr(gender, weight, height, age);
  const maintenanceCalories = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));
  const protein = Math.round(weight * 1.6); // 1.6g per kg for active individuals
  const fats = Math.round((maintenanceCalories * 0.25) / 9); // 25% of calories from fats
  const carbs = Math.round((maintenanceCalories - protein * 4 - fats * 9) / 4);
  return { maintenanceCalories, protein, carbs, fats };
};
