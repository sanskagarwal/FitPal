import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// SQLite-backed storage layer.
//
// Each record is stored as a JSON blob in a `data` column so the API response
// shapes stay byte-for-byte identical to the previous file-based store, while
// gaining transactions, atomic writes and crash safety from SQLite.
// ---------------------------------------------------------------------------

let db: Database.Database;

export function initStorage(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'fitpal.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // better concurrency + durability
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id    TEXT PRIMARY KEY,
      email TEXT,
      data  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS meals (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);

    CREATE TABLE IF NOT EXISTS weights (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_weights_user ON weights(user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      user_id TEXT PRIMARY KEY,
      data    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT PRIMARY KEY,
      data    TEXT NOT NULL
    );
  `);

  migrateFromJsonFiles(dataDir);
}

// ---------------------------------------------------------------------------
// One-time importer: loads any existing `*.json` files from the old file-based
// store into SQLite. Idempotent (upserts / INSERT OR IGNORE) and gated by a
// marker file so it only runs once.
// ---------------------------------------------------------------------------
function migrateFromJsonFiles(dataDir: string): void {
  const marker = path.join(dataDir, '.sqlite-migrated');
  if (fs.existsSync(marker)) return;

  let files: string[] = [];
  try {
    files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  } catch {
    files = [];
  }

  if (files.length === 0) {
    fs.writeFileSync(marker, new Date().toISOString());
    return;
  }

  const readJson = (file: string): unknown => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    } catch (error) {
      console.error(`Skipping unreadable JSON file during migration: ${file}`, error);
      return null;
    }
  };

  let imported = 0;
  const importAll = db.transaction(() => {
    for (const file of files) {
      if (file.startsWith('user-')) {
        const user = readJson(file) as { id?: string } | null;
        if (user?.id) {
          saveUser(user);
          imported++;
        }
      } else if (file.startsWith('meals-')) {
        const meals = readJson(file) as Array<{ id?: string; userId?: string }> | null;
        if (Array.isArray(meals)) {
          for (const meal of meals) {
            if (meal?.id) {
              insertMealIgnore(meal);
              imported++;
            }
          }
        }
      } else if (file.startsWith('weights-')) {
        const weights = readJson(file) as Array<{ id?: string; userId?: string }> | null;
        if (Array.isArray(weights)) {
          for (const weight of weights) {
            if (weight?.id) {
              insertWeightIgnore(weight);
              imported++;
            }
          }
        }
      } else if (file.startsWith('notifications-')) {
        const settings = readJson(file) as { userId?: string } | null;
        if (settings?.userId) {
          saveNotifications(settings);
          imported++;
        }
      } else if (file.startsWith('streak-')) {
        const streak = readJson(file) as { userId?: string } | null;
        if (streak?.userId) {
          saveStreak(streak);
          imported++;
        }
      }
    }
  });

  importAll();
  fs.writeFileSync(marker, new Date().toISOString());
  if (imported > 0) {
    console.log(`📦 Migrated ${imported} record(s) from JSON files into SQLite.`);
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export function saveUser(user: { id?: string; email?: string }): void {
  db.prepare(
    `INSERT INTO users (id, email, data) VALUES (@id, @email, @data)
     ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data`
  ).run({ id: user.id, email: user.email ?? null, data: JSON.stringify(user) });
}

export function getUser(id: string): unknown | null {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function getUserByEmail(email: string): unknown | null {
  const row = db.prepare('SELECT data FROM users WHERE email = ?').get(email) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------
export function addMeal(meal: { id: string; userId: string }): void {
  db.prepare('INSERT INTO meals (id, user_id, data) VALUES (?, ?, ?)').run(
    meal.id,
    meal.userId,
    JSON.stringify(meal)
  );
}

function insertMealIgnore(meal: { id?: string; userId?: string }): void {
  db.prepare('INSERT OR IGNORE INTO meals (id, user_id, data) VALUES (?, ?, ?)').run(
    meal.id,
    meal.userId ?? null,
    JSON.stringify(meal)
  );
}

export function getMeals(userId: string): unknown[] {
  const rows = db.prepare('SELECT data FROM meals WHERE user_id = ?').all(userId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function updateMeal(id: string, meal: unknown): boolean {
  const result = db.prepare('UPDATE meals SET data = ? WHERE id = ?').run(JSON.stringify(meal), id);
  return result.changes > 0;
}

export function deleteMeal(id: string): void {
  db.prepare('DELETE FROM meals WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------
export function addWeight(weight: { id: string; userId: string }): void {
  db.prepare('INSERT INTO weights (id, user_id, data) VALUES (?, ?, ?)').run(
    weight.id,
    weight.userId,
    JSON.stringify(weight)
  );
}

function insertWeightIgnore(weight: { id?: string; userId?: string }): void {
  db.prepare('INSERT OR IGNORE INTO weights (id, user_id, data) VALUES (?, ?, ?)').run(
    weight.id,
    weight.userId ?? null,
    JSON.stringify(weight)
  );
}

export function getWeights(userId: string): unknown[] {
  const rows = db.prepare('SELECT data FROM weights WHERE user_id = ?').all(userId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function updateWeight(id: string, weight: unknown): boolean {
  const result = db.prepare('UPDATE weights SET data = ? WHERE id = ?').run(JSON.stringify(weight), id);
  return result.changes > 0;
}

export function deleteWeight(id: string): void {
  db.prepare('DELETE FROM weights WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Notification settings (one row per user)
// ---------------------------------------------------------------------------
export function saveNotifications(settings: { userId?: string }): void {
  db.prepare(
    `INSERT INTO notifications (user_id, data) VALUES (@userId, @data)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data`
  ).run({ userId: settings.userId, data: JSON.stringify(settings) });
}

export function getNotifications(userId: string): unknown | null {
  const row = db.prepare('SELECT data FROM notifications WHERE user_id = ?').get(userId) as
    | { data: string }
    | undefined;
  return row ? JSON.parse(row.data) : null;
}

// ---------------------------------------------------------------------------
// Streaks (one row per user)
// ---------------------------------------------------------------------------
export function saveStreak(streak: { userId?: string }): void {
  db.prepare(
    `INSERT INTO streaks (user_id, data) VALUES (@userId, @data)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data`
  ).run({ userId: streak.userId, data: JSON.stringify(streak) });
}

export function getStreak(userId: string): unknown | null {
  const row = db.prepare('SELECT data FROM streaks WHERE user_id = ?').get(userId) as
    | { data: string }
    | undefined;
  return row ? JSON.parse(row.data) : null;
}
