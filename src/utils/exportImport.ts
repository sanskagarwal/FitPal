import { ExportData } from '../types';
import { User, MealEntry, WeightEntry, NotificationSettings } from '../types';
import {
  saveUser,
  saveMeal,
  saveWeight,
  saveNotificationSettings,
  getMealsByUser,
  getWeightsByUser,
  updateMeal,
  updateWeight,
} from './db';

// Export all user data to JSON
export const exportDataAsJSON = async (
  user: User,
  meals: MealEntry[],
  weights: WeightEntry[],
  notifications?: NotificationSettings
): Promise<void> => {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date(),
    user,
    meals,
    weightEntries: weights,
    notifications: notifications || {
      userId: user.id,
      enabled: false,
    },
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `fitpal-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};

// Export data as CSV
export const exportDataAsCSV = async (
  meals: MealEntry[],
  weights: WeightEntry[]
): Promise<void> => {
  // Export meals as CSV
  const mealsCSV = [
    'Date,Meal Type,Calories,Protein,Carbs,Fats,Notes',
    ...meals.map(meal => 
      `${new Date(meal.date).toISOString()},${meal.mealType},${meal.totalNutrients.calories},${meal.totalNutrients.protein},${meal.totalNutrients.carbs},${meal.totalNutrients.fats},"${meal.notes || ''}"`
    )
  ].join('\n');

  const mealsBlob = new Blob([mealsCSV], { type: 'text/csv' });
  const mealsUrl = URL.createObjectURL(mealsBlob);
  
  const mealsLink = document.createElement('a');
  mealsLink.href = mealsUrl;
  mealsLink.download = `fitpal-meals-${new Date().toISOString().split('T')[0]}.csv`;
  mealsLink.click();
  
  URL.revokeObjectURL(mealsUrl);

  // Export weights as CSV
  const weightsCSV = [
    'Date,Weight (kg),BMI,Body Fat %,Notes',
    ...weights.map(weight => 
      `${new Date(weight.date).toISOString()},${weight.weight},${weight.bmi},${weight.bodyFat || ''},"${weight.notes || ''}"`
    )
  ].join('\n');

  const weightsBlob = new Blob([weightsCSV], { type: 'text/csv' });
  const weightsUrl = URL.createObjectURL(weightsBlob);
  
  const weightsLink = document.createElement('a');
  weightsLink.href = weightsUrl;
  weightsLink.download = `fitpal-weights-${new Date().toISOString().split('T')[0]}.csv`;
  weightsLink.click();
  
  URL.revokeObjectURL(weightsUrl);
};

// Summary of what a restore wrote, so the UI can confirm with concrete counts.
export interface ImportResult {
  meals: number;
  weights: number;
}

// Import data from a JSON backup, restoring it onto the currently signed-in
// user. Every record is re-mapped to `currentUserId` so a backup can be
// restored onto a fresh account, and so a user can never import records that
// target someone else (the server enforces ownership too). Records whose ids
// already exist are updated, making re-imports idempotent instead of failing on
// a duplicate id. Throws on an invalid file or a failed write so the caller can
// surface the error.
export const importDataFromJSON = async (
  file: File,
  currentUserId: string
): Promise<ImportResult> => {
  const text = await file.text();
  const data = JSON.parse(text) as ExportData;

  // Validate the minimum shape before touching any storage.
  if (!data.version || !data.user) {
    throw new Error('Invalid backup file format');
  }

  // Restore profile and goals. The server merges into the session user and
  // ignores the body id, so this only ever updates the current account.
  await saveUser({ ...data.user, id: currentUserId });

  // Import meals, re-mapping ownership and updating any that already exist.
  const existingMealIds = new Set((await getMealsByUser(currentUserId)).map((m) => m.id));
  let meals = 0;
  for (const meal of data.meals ?? []) {
    const record: MealEntry = { ...meal, userId: currentUserId };
    if (existingMealIds.has(record.id)) {
      await updateMeal(record);
    } else {
      await saveMeal(record);
    }
    meals += 1;
  }

  // Import weights the same way.
  const existingWeightIds = new Set((await getWeightsByUser(currentUserId)).map((w) => w.id));
  let weights = 0;
  for (const weight of data.weightEntries ?? []) {
    const record: WeightEntry = { ...weight, userId: currentUserId };
    if (existingWeightIds.has(record.id)) {
      await updateWeight(record);
    } else {
      await saveWeight(record);
    }
    weights += 1;
  }

  if (data.notifications) {
    await saveNotificationSettings({ ...data.notifications, userId: currentUserId });
  }

  return { meals, weights };
};
