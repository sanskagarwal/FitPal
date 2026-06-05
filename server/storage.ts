import { initDatabase } from './db/database.js';
import { seedNutritionCache } from './repositories/nutritionRepository.js';

// ---------------------------------------------------------------------------
// Storage bootstrap.
//
// Opens the SQLite connection, creates the schema, and seeds the curated
// nutrition cache. The per-entity CRUD that used to live here now lives in
// `repositories/`, built on the shared base helpers in `db/repository.ts`.
// ---------------------------------------------------------------------------
export function initStorage(dataDir: string): void {
  initDatabase(dataDir);
  seedNutritionCache();
}
