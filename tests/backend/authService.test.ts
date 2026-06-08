import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStorage } from '../../server/storage.js';
import { closeDatabase } from '../../server/db/database.js';
import { authService } from '../../server/services/authService.js';
import { userRepository } from '../../server/repositories/userRepository.js';
import { mealRepository } from '../../server/repositories/mealRepository.js';
import { weightRepository } from '../../server/repositories/weightRepository.js';
import { notificationRepository } from '../../server/repositories/notificationRepository.js';
import { streakRepository } from '../../server/repositories/streakRepository.js';
import { ConflictError, AuthError, NotFoundError } from '../../server/errors.js';
import { validProfile } from './helpers.js';

let dataDir: string;

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitpal-authsvc-'));
  initStorage(dataDir);
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function newEmail() {
  return `svc-${randomUUID()}@example.com`;
}

describe('authService.register', () => {
  it('creates a user and returns a public user without the password', async () => {
    const email = newEmail();
    const { user, userId } = await authService.register({
      name: 'Alice',
      email,
      password: 'password123',
      profile: validProfile(),
    });
    expect(userId).toBeTruthy();
    expect(user.email).toBe(email);
    expect((user as Record<string, unknown>).password).toBeUndefined();
  });

  it('rejects a duplicate email with a ConflictError', async () => {
    const email = newEmail();
    const base = { name: 'Bob', email, password: 'password123', profile: validProfile() };
    await authService.register(base);
    await expect(authService.register(base)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('authService.login', () => {
  it('authenticates with correct credentials', async () => {
    const email = newEmail();
    await authService.register({
      name: 'Carol',
      email,
      password: 'password123',
      profile: validProfile(),
    });
    const { user } = await authService.login(email, 'password123');
    expect(user.email).toBe(email);
  });

  it('rejects an unknown email', async () => {
    await expect(authService.login(newEmail(), 'password123')).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects a wrong password', async () => {
    const email = newEmail();
    await authService.register({
      name: 'Dave',
      email,
      password: 'password123',
      profile: validProfile(),
    });
    await expect(authService.login(email, 'wrong-password')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('authService.getMe', () => {
  it('returns the stored user for a valid id', async () => {
    const email = newEmail();
    const { userId } = await authService.register({
      name: 'Eve',
      email,
      password: 'password123',
      profile: validProfile(),
    });
    expect(authService.getMe(userId).email).toBe(email);
  });

  it('throws NotFoundError for an unknown id', () => {
    expect(() => authService.getMe('does-not-exist')).toThrow(NotFoundError);
  });
});

describe('authService.deleteAccount', () => {
  it('removes the user and all their data when the password is correct', async () => {
    const email = newEmail();
    const { userId } = await authService.register({
      name: 'Frank',
      email,
      password: 'password123',
      profile: validProfile(),
    });

    // Seed owned data across the per-user tables.
    mealRepository.insert({ id: randomUUID(), userId, mealType: 'breakfast' });
    weightRepository.insert({ id: randomUUID(), userId, weight: 80 });
    notificationRepository.upsert({ userId, enabled: true });
    streakRepository.upsert({ userId, currentStreak: 3 });

    await authService.deleteAccount(userId, 'password123');

    expect(userRepository.findById(userId)).toBeNull();
    expect(mealRepository.listByUser(userId)).toHaveLength(0);
    expect(weightRepository.listByUser(userId)).toHaveLength(0);
    expect(notificationRepository.get(userId)).toBeNull();
    expect(streakRepository.get(userId)).toBeNull();
  });

  it('rejects an incorrect password and keeps the account', async () => {
    const email = newEmail();
    const { userId } = await authService.register({
      name: 'Grace',
      email,
      password: 'password123',
      profile: validProfile(),
    });

    await expect(authService.deleteAccount(userId, 'wrong-password')).rejects.toBeInstanceOf(
      AuthError
    );
    expect(userRepository.findById(userId)).not.toBeNull();
  });

  it('throws NotFoundError for an unknown user', async () => {
    await expect(authService.deleteAccount('does-not-exist', 'password123')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
