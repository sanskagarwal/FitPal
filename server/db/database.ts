import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// SQLite connection + schema.
//
// Owns the single better-sqlite3 handle for the process. Each record is stored
// as a JSON blob in a `data` column so API response shapes stay byte-for-byte
// identical to the original file-based store, while gaining transactions,
// atomic writes and crash safety from SQLite. Repositories import `getDb()`.
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

export function initDatabase(dataDir: string): Database.Database {
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

    CREATE TABLE IF NOT EXISTS nutrition_cache (
      key     TEXT PRIMARY KEY,
      data    TEXT NOT NULL,
      source  TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised — call initDatabase() first.');
  }
  return db;
}
