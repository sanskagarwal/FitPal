import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExportData, MealEntry, User, WeightEntry } from '../../src/types';
import { ActivityLevel, DietPreference, Gender, MealType } from '../../src/types';

// Mock the db client so the import logic can be tested without a server. Each
// spy lets us assert how records are re-mapped and routed (insert vs update).
const saveUser = vi.fn();
const saveMeal = vi.fn();
const saveWeight = vi.fn();
const saveNotificationSettings = vi.fn();
const updateMeal = vi.fn();
const updateWeight = vi.fn();
const getMealsByUser = vi.fn();
const getWeightsByUser = vi.fn();

vi.mock('../../src/utils/db', () => ({
  saveUser: (...args: unknown[]) => saveUser(...args),
  saveMeal: (...args: unknown[]) => saveMeal(...args),
  saveWeight: (...args: unknown[]) => saveWeight(...args),
  saveNotificationSettings: (...args: unknown[]) => saveNotificationSettings(...args),
  updateMeal: (...args: unknown[]) => updateMeal(...args),
  updateWeight: (...args: unknown[]) => updateWeight(...args),
  getMealsByUser: (...args: unknown[]) => getMealsByUser(...args),
  getWeightsByUser: (...args: unknown[]) => getWeightsByUser(...args),
}));

// Imported after the mock so the module under test picks up the mocked db.
const { importDataFromJSON } = await import('../../src/utils/exportImport');

const buildUser = (id: string): User => ({
  id,
  name: 'Backup User',
  email: 'backup@example.com',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  profile: {
    dateOfBirth: '1990-01-01',
    gender: Gender.Male,
    height: 175,
    activityLevel: ActivityLevel.Moderate,
    dietPreference: DietPreference.Vegetarian,
    goals: {
      targetWeight: 70,
      targetCalories: 2000,
      targetProtein: 120,
      targetCarbs: 220,
      targetFats: 60,
      targetFiber: 30,
    },
  },
});

const buildMeal = (id: string, userId: string): MealEntry => ({
  id,
  userId,
  date: new Date('2024-02-01T08:00:00.000Z'),
  mealType: MealType.Breakfast,
  foods: [],
  totalNutrients: { calories: 300, protein: 20, carbs: 30, fats: 10, fiber: 5 },
});

const buildWeight = (id: string, userId: string): WeightEntry => ({
  id,
  userId,
  date: new Date('2024-02-01T07:00:00.000Z'),
  weight: 72,
  bmi: 23.5,
});

const buildBackup = (sourceUserId: string): ExportData => ({
  version: '1.0.0',
  exportDate: new Date('2024-03-01T00:00:00.000Z'),
  user: buildUser(sourceUserId),
  meals: [buildMeal('meal-1', sourceUserId), buildMeal('meal-2', sourceUserId)],
  weightEntries: [buildWeight('weight-1', sourceUserId)],
  notifications: { userId: sourceUserId, enabled: true, breakfast: '08:00' },
});

const asFile = (data: ExportData): File =>
  new File([JSON.stringify(data)], 'fitpal-backup.json', { type: 'application/json' });

describe('importDataFromJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMealsByUser.mockResolvedValue([]);
    getWeightsByUser.mockResolvedValue([]);
  });

  it('rejects a file that is not a FitPal backup', async () => {
    const file = new File(['{"foo":"bar"}'], 'bad.json', { type: 'application/json' });
    await expect(importDataFromJSON(file, 'current-user')).rejects.toThrow(
      'Invalid backup file format'
    );
    expect(saveMeal).not.toHaveBeenCalled();
  });

  it('re-maps every record to the current user', async () => {
    const file = asFile(buildBackup('other-user'));

    const result = await importDataFromJSON(file, 'current-user');

    expect(result).toEqual({ meals: 2, weights: 1 });
    expect(saveUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'current-user' }));
    expect(saveMeal).toHaveBeenCalledTimes(2);
    expect(saveMeal).toHaveBeenCalledWith(expect.objectContaining({ userId: 'current-user' }));
    expect(saveWeight).toHaveBeenCalledWith(expect.objectContaining({ userId: 'current-user' }));
    expect(saveNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'current-user', enabled: true })
    );
  });

  it('updates records that already exist instead of inserting duplicates', async () => {
    getMealsByUser.mockResolvedValue([buildMeal('meal-1', 'current-user')]);
    getWeightsByUser.mockResolvedValue([buildWeight('weight-1', 'current-user')]);
    const file = asFile(buildBackup('current-user'));

    const result = await importDataFromJSON(file, 'current-user');

    expect(result).toEqual({ meals: 2, weights: 1 });
    // meal-1 exists -> update, meal-2 is new -> insert.
    expect(updateMeal).toHaveBeenCalledTimes(1);
    expect(updateMeal).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-1' }));
    expect(saveMeal).toHaveBeenCalledTimes(1);
    expect(saveMeal).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-2' }));
    // weight-1 exists -> update, none inserted.
    expect(updateWeight).toHaveBeenCalledTimes(1);
    expect(saveWeight).not.toHaveBeenCalled();
  });

  it('propagates a storage failure to the caller', async () => {
    saveMeal.mockRejectedValueOnce(new Error('network down'));
    const file = asFile(buildBackup('current-user'));

    await expect(importDataFromJSON(file, 'current-user')).rejects.toThrow('network down');
  });
});
