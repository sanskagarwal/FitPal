import { ExportData } from '../types';
import { User, MealEntry, WeightEntry, NotificationSettings } from '../types';
import { 
  saveUser, 
  saveMeal, 
  saveWeight, 
  saveNotificationSettings 
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

// Import data from JSON
export const importDataFromJSON = async (file: File): Promise<boolean> => {
  try {
    const text = await file.text();
    const data: ExportData = JSON.parse(text);

    // Validate version
    if (!data.version || !data.user) {
      throw new Error('Invalid backup file format');
    }

    // Import user
    await saveUser(data.user);

    // Import meals
    for (const meal of data.meals) {
      await saveMeal(meal);
    }

    // Import weights
    for (const weight of data.weightEntries) {
      await saveWeight(weight);
    }

    // Import notifications
    if (data.notifications) {
      await saveNotificationSettings(data.notifications);
    }

    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};
