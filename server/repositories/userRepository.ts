import { getDb } from '../db/database.js';

// ---------------------------------------------------------------------------
// User repository.
//
// Users don't fit the generic collection/singleton shapes (they're keyed by id
// AND indexed by email, and carry the password hash), so this repository is
// hand-written. The full record — including the bcrypt hash — is server-only;
// callers must run it through `toPublicUser` before sending it to a client.
// ---------------------------------------------------------------------------

export interface StoredUser {
  id: string;
  email?: string;
  password?: string;
  [key: string]: unknown;
}

export const userRepository = {
  save(user: StoredUser): void {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, data) VALUES (@id, @email, @data)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data`
      )
      .run({ id: user.id, email: user.email ?? null, data: JSON.stringify(user) });
  },

  findById(id: string): StoredUser | null {
    const row = getDb().prepare('SELECT data FROM users WHERE id = ?').get(id) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as StoredUser) : null;
  },

  findByEmail(email: string): StoredUser | null {
    const row = getDb().prepare('SELECT data FROM users WHERE email = ?').get(email) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as StoredUser) : null;
  },

  emailExists(email: string): boolean {
    return Boolean(getDb().prepare('SELECT 1 FROM users WHERE email = ?').get(email));
  },

  // Delete the user row by id. Returns true when a row was removed. Callers are
  // responsible for also removing the user's other data (meals, weights, etc.).
  delete(id: string): boolean {
    return getDb().prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  },
};

// Strip sensitive fields before returning a user to the client.
export function toPublicUser(user: StoredUser | null): Omit<StoredUser, 'password'> | null {
  if (!user) return null;
  const { password: _password, ...publicUser } = user;
  void _password;
  return publicUser;
}
