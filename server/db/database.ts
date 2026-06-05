import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from './migrations.js';

// ---------------------------------------------------------------------------
// SQLite connection + schema.
//
// Owns the single better-sqlite3 handle for the process. Each record is stored
// as a JSON blob in a `data` column so API response shapes stay byte-for-byte
// identical to the original file-based store, while gaining transactions,
// atomic writes and crash safety from SQLite. Repositories import `getDb()`.
// The schema is evolved through versioned migrations (see db/migrations.ts).
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

export function initDatabase(dataDir: string): Database.Database {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'fitpal.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // better concurrency + durability
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised — call initDatabase() first.');
  }
  return db;
}

// Close the connection and clear the singleton. Used by tests to tear down an
// isolated database between runs; a no-op when nothing is open.
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
