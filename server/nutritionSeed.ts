// ---------------------------------------------------------------------------
// Seed data for the self-bootstrapping nutrition cache.
//
// Each entry pins the per-ONE-unit nutrition for a common Indian dish so the
// chat agent's headline numbers are consistent across logs instead of being
// re-hallucinated every time. Values are typical Indian home portions for a
// single unit (one katori ~150g, one piece, one glass ~200ml). They are
// deliberately mid-range; the cache also learns new foods at runtime from
// high-confidence model outputs.
//
// Units: calories kcal, protein/carbs/fats/fiber/sugar g, sodium/calcium/iron/
// magnesium/potassium mg, vitaminA/vitaminD mcg, vitaminC mg.
// ---------------------------------------------------------------------------
import { MealUnit } from './domain.js';

export interface SeedNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  potassium?: number;
}

export interface NutritionSeedEntry {
  name: string;
  // The enum's string-value union, so the readable literals below stay valid
  // while remaining tied to MealUnit.
  unit: `${MealUnit}`;
  servingSize: string;
  nutrients: SeedNutrients;
}

export const NUTRITION_SEED: NutritionSeedEntry[] = [
  // Breads
  { name: 'roti', unit: 'piece', servingSize: '1 roti (~40g)', nutrients: { calories: 104, protein: 3, carbs: 20, fats: 1.5, fiber: 3, sugar: 0.5, sodium: 120, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 6, iron: 0.5, magnesium: 19, potassium: 43 } },
  { name: 'chapati', unit: 'piece', servingSize: '1 chapati (~40g)', nutrients: { calories: 104, protein: 3, carbs: 20, fats: 1.5, fiber: 3, sugar: 0.5, sodium: 120, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 6, iron: 0.5, magnesium: 19, potassium: 43 } },
  { name: 'phulka', unit: 'piece', servingSize: '1 phulka (~35g)', nutrients: { calories: 90, protein: 3, carbs: 18, fats: 1, fiber: 3, sugar: 0.5, sodium: 100, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 5, iron: 0.4, magnesium: 17, potassium: 37 } },
  { name: 'plain paratha', unit: 'piece', servingSize: '1 paratha (~60g)', nutrients: { calories: 180, protein: 4, carbs: 26, fats: 7, fiber: 3, sugar: 0.5, sodium: 200, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 9, iron: 0.7, magnesium: 28, potassium: 64 } },
  { name: 'aloo paratha', unit: 'piece', servingSize: '1 paratha (~120g)', nutrients: { calories: 260, protein: 6, carbs: 36, fats: 10, fiber: 4, sugar: 1, sodium: 380, vitaminA: 0, vitaminC: 9, vitaminD: 0, calcium: 14, iron: 1.1, magnesium: 39, potassium: 289 } },
  { name: 'naan', unit: 'piece', servingSize: '1 naan (~90g)', nutrients: { calories: 260, protein: 8, carbs: 45, fats: 5, fiber: 2, sugar: 3, sodium: 420, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 11, iron: 0.5, magnesium: 14, potassium: 81 } },
  { name: 'puri', unit: 'piece', servingSize: '1 puri (~25g)', nutrients: { calories: 85, protein: 1.5, carbs: 11, fats: 4, fiber: 1, sugar: 0.2, sodium: 90, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 4, iron: 0.2, magnesium: 7, potassium: 30 } },
  { name: 'bhatura', unit: 'piece', servingSize: '1 bhatura (~80g)', nutrients: { calories: 230, protein: 5, carbs: 32, fats: 9, fiber: 1.5, sugar: 1, sodium: 300, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 12, iron: 0.7, magnesium: 22, potassium: 95 } },

  // Rice
  { name: 'plain rice', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 200, protein: 4, carbs: 44, fats: 0.5, fiber: 1, sugar: 0, sodium: 5, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 15, iron: 0.6, magnesium: 18, potassium: 53 } },
  { name: 'jeera rice', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 230, protein: 4, carbs: 44, fats: 4, fiber: 1, sugar: 0, sodium: 250, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 16, iron: 0.7, magnesium: 19, potassium: 56 } },
  { name: 'veg biryani', unit: 'katori', servingSize: '1 katori (~180g)', nutrients: { calories: 290, protein: 6, carbs: 45, fats: 9, fiber: 3, sugar: 2, sodium: 480, vitaminA: 50, vitaminC: 4, vitaminD: 0, calcium: 23, iron: 0.8, magnesium: 26, potassium: 121 } },
  { name: 'chicken biryani', unit: 'katori', servingSize: '1 katori (~180g)', nutrients: { calories: 330, protein: 16, carbs: 40, fats: 12, fiber: 2, sugar: 2, sodium: 560, vitaminA: 14, vitaminC: 0, vitaminD: 0, calcium: 19, iron: 1.0, magnesium: 25, potassium: 142 } },
  { name: 'curd rice', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 180, protein: 5, carbs: 30, fats: 4, fiber: 1, sugar: 3, sodium: 220, vitaminA: 14, vitaminC: 0, vitaminD: 0, calcium: 71, iron: 0.5, magnesium: 18, potassium: 113 } },
  { name: 'lemon rice', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 220, protein: 4, carbs: 40, fats: 6, fiber: 1.5, sugar: 1, sodium: 320, vitaminA: 0, vitaminC: 5, vitaminD: 0, calcium: 16, iron: 0.9, magnesium: 34, potassium: 88 } },

  // Dals & legumes
  { name: 'dal', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 150, protein: 9, carbs: 20, fats: 4, fiber: 5, sugar: 1, sodium: 400, vitaminA: 3, vitaminC: 2, vitaminD: 0, calcium: 30, iron: 2.3, magnesium: 45, potassium: 330 } },
  { name: 'dal tadka', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 170, protein: 9, carbs: 20, fats: 6, fiber: 5, sugar: 1, sodium: 450, vitaminA: 3, vitaminC: 2, vitaminD: 0, calcium: 30, iron: 2.3, magnesium: 45, potassium: 330 } },
  { name: 'dal makhani', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 280, protein: 10, carbs: 24, fats: 15, fiber: 6, sugar: 2, sodium: 520, vitaminA: 10, vitaminC: 1, vitaminD: 0, calcium: 40, iron: 2.0, magnesium: 40, potassium: 240 } },
  { name: 'rajma', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 210, protein: 9, carbs: 30, fats: 6, fiber: 7, sugar: 2, sodium: 460, vitaminA: 0, vitaminC: 2, vitaminD: 0, calcium: 42, iron: 3.0, magnesium: 60, potassium: 390 } },
  { name: 'chole', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 230, protein: 9, carbs: 30, fats: 8, fiber: 8, sugar: 3, sodium: 520, vitaminA: 3, vitaminC: 2, vitaminD: 0, calcium: 74, iron: 4.4, magnesium: 72, potassium: 437 } },
  { name: 'sambar', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 130, protein: 6, carbs: 18, fats: 4, fiber: 4, sugar: 2, sodium: 420, vitaminA: 15, vitaminC: 5, vitaminD: 0, calcium: 24, iron: 1.5, magnesium: 32, potassium: 276 } },

  // Sabzi / curries
  { name: 'mixed vegetable sabzi', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 140, protein: 4, carbs: 16, fats: 7, fiber: 5, sugar: 4, sodium: 380, vitaminA: 75, vitaminC: 12, vitaminD: 0, calcium: 38, iron: 1.2, magnesium: 23, potassium: 375 } },
  { name: 'aloo gobi', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 160, protein: 4, carbs: 20, fats: 8, fiber: 5, sugar: 4, sodium: 400, vitaminA: 1, vitaminC: 44, vitaminD: 0, calcium: 19, iron: 0.7, magnesium: 26, potassium: 509 } },
  { name: 'palak paneer', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 250, protein: 11, carbs: 12, fats: 18, fiber: 4, sugar: 3, sodium: 480, vitaminA: 444, vitaminC: 22, vitaminD: 0, calcium: 320, iron: 3.0, magnesium: 76, potassium: 408 } },
  { name: 'paneer butter masala', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 320, protein: 12, carbs: 14, fats: 24, fiber: 2, sugar: 6, sodium: 560, vitaminA: 69, vitaminC: 10, vitaminD: 0, calcium: 344, iron: 0.3, magnesium: 17, potassium: 239 } },
  { name: 'bhindi masala', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 150, protein: 3, carbs: 14, fats: 9, fiber: 5, sugar: 3, sodium: 360, vitaminA: 54, vitaminC: 24, vitaminD: 0, calcium: 123, iron: 0.8, magnesium: 54, potassium: 384 } },
  { name: 'chicken curry', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 240, protein: 20, carbs: 8, fats: 15, fiber: 1.5, sugar: 3, sodium: 560, vitaminA: 53, vitaminC: 4, vitaminD: 0, calcium: 21, iron: 1.2, magnesium: 27, potassium: 315 } },
  { name: 'egg curry', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 210, protein: 12, carbs: 8, fats: 14, fiber: 1.5, sugar: 3, sodium: 480, vitaminA: 146, vitaminC: 5, vitaminD: 3, calcium: 46, iron: 1.4, magnesium: 17, potassium: 225 } },

  // South Indian
  { name: 'idli', unit: 'piece', servingSize: '1 idli (~40g)', nutrients: { calories: 58, protein: 2, carbs: 12, fats: 0.3, fiber: 0.8, sugar: 0.2, sodium: 110, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 7, iron: 0.5, magnesium: 12, potassium: 55 } },
  { name: 'plain dosa', unit: 'piece', servingSize: '1 dosa (~80g)', nutrients: { calories: 165, protein: 4, carbs: 28, fats: 4, fiber: 1.5, sugar: 0.5, sodium: 240, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 14, iron: 1.0, magnesium: 25, potassium: 110 } },
  { name: 'masala dosa', unit: 'piece', servingSize: '1 dosa (~150g)', nutrients: { calories: 290, protein: 6, carbs: 44, fats: 10, fiber: 3, sugar: 1, sodium: 420, vitaminA: 0, vitaminC: 11, vitaminD: 0, calcium: 21, iron: 1.4, magnesium: 40, potassium: 425 } },
  { name: 'medu vada', unit: 'piece', servingSize: '1 vada (~50g)', nutrients: { calories: 140, protein: 4, carbs: 16, fats: 7, fiber: 2, sugar: 0.3, sodium: 220, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 17, iron: 1.0, magnesium: 30, potassium: 90 } },
  { name: 'upma', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 200, protein: 5, carbs: 30, fats: 7, fiber: 2, sugar: 1, sodium: 380, vitaminA: 5, vitaminC: 2, vitaminD: 0, calcium: 20, iron: 1.5, magnesium: 30, potassium: 120 } },
  { name: 'poha', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 180, protein: 4, carbs: 32, fats: 5, fiber: 2, sugar: 2, sodium: 350, vitaminA: 0, vitaminC: 6, vitaminD: 0, calcium: 17, iron: 3.0, magnesium: 28, potassium: 110 } },

  // Snacks
  { name: 'samosa', unit: 'piece', servingSize: '1 samosa (~60g)', nutrients: { calories: 160, protein: 3, carbs: 18, fats: 9, fiber: 2, sugar: 1, sodium: 280, vitaminA: 0, vitaminC: 6, vitaminD: 0, calcium: 7, iron: 0.5, magnesium: 12, potassium: 175 } },
  { name: 'pakora', unit: 'piece', servingSize: '1 pakora (~25g)', nutrients: { calories: 75, protein: 2, carbs: 7, fats: 4.5, fiber: 1, sugar: 0.3, sodium: 140, vitaminA: 5, vitaminC: 1, vitaminD: 0, calcium: 6, iron: 0.5, magnesium: 9, potassium: 55 } },
  { name: 'dhokla', unit: 'piece', servingSize: '1 piece (~40g)', nutrients: { calories: 60, protein: 2.5, carbs: 9, fats: 1.5, fiber: 1, sugar: 1.5, sodium: 180, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 25, iron: 0.8, magnesium: 15, potassium: 70 } },

  // Dairy & drinks
  { name: 'milk', unit: 'glass', servingSize: '1 glass (~200ml)', nutrients: { calories: 120, protein: 6, carbs: 10, fats: 6, fiber: 0, sugar: 10, sodium: 90, vitaminA: 92, vitaminC: 2, vitaminD: 0.2, calcium: 226, iron: 0.1, magnesium: 20, potassium: 300 } },
  { name: 'curd', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 90, protein: 5, carbs: 7, fats: 5, fiber: 0, sugar: 7, sodium: 70, vitaminA: 42, vitaminC: 1, vitaminD: 0.2, calcium: 182, iron: 0.2, magnesium: 17, potassium: 233 } },
  { name: 'lassi', unit: 'glass', servingSize: '1 glass (~250ml)', nutrients: { calories: 180, protein: 6, carbs: 24, fats: 6, fiber: 0, sugar: 22, sodium: 100, vitaminA: 30, vitaminC: 1, vitaminD: 0.1, calcium: 144, iron: 0.1, magnesium: 14, potassium: 175 } },
  { name: 'masala chai', unit: 'cup', servingSize: '1 cup (~150ml)', nutrients: { calories: 80, protein: 2, carbs: 11, fats: 3, fiber: 0, sugar: 10, sodium: 40, vitaminA: 28, vitaminC: 0, vitaminD: 0, calcium: 68, iron: 0.2, magnesium: 6, potassium: 90 } },

  // Sweets
  { name: 'gulab jamun', unit: 'piece', servingSize: '1 piece (~40g)', nutrients: { calories: 150, protein: 2, carbs: 22, fats: 6, fiber: 0.3, sugar: 18, sodium: 45, vitaminA: 15, vitaminC: 0, vitaminD: 0, calcium: 80, iron: 0.2, magnesium: 8, potassium: 60 } },
  { name: 'kheer', unit: 'katori', servingSize: '1 katori (~150g)', nutrients: { calories: 230, protein: 6, carbs: 35, fats: 7, fiber: 0.5, sugar: 28, sodium: 90, vitaminA: 50, vitaminC: 0, vitaminD: 0.1, calcium: 170, iron: 0.2, magnesium: 13, potassium: 175 } },

  // Egg / paneer staples
  { name: 'boiled egg', unit: 'piece', servingSize: '1 egg (~50g)', nutrients: { calories: 78, protein: 6, carbs: 0.6, fats: 5, fiber: 0, sugar: 0.4, sodium: 62, vitaminA: 74, vitaminC: 0, vitaminD: 1.1, calcium: 25, iron: 0.8, magnesium: 6, potassium: 63 } },
  { name: 'paneer', unit: 'katori', servingSize: '1 katori (~100g)', nutrients: { calories: 296, protein: 18, carbs: 4, fats: 22, fiber: 0, sugar: 2, sodium: 18, vitaminA: 50, vitaminC: 0, vitaminD: 0.4, calcium: 480, iron: 0.2, magnesium: 12, potassium: 70 } },
];
