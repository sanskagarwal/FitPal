import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStorage } from '../../server/storage.js';
import { closeDatabase } from '../../server/db/database.js';
import { mealService } from '../../server/services/mealService.js';
import { NotFoundError } from '../../server/errors.js';
import type { MealRecord } from '../../server/repositories/mealRepository.js';

let dataDir: string;

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitpal-mealsvc-'));
  initStorage(dataDir);
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function meal(userId: string, overrides: Partial<MealRecord> = {}): MealRecord {
  return {
    id: randomUUID(),
    userId,
    mealType: 'breakfast',
    date: new Date().toISOString(),
    ...overrides,
  };
}

describe('mealService', () => {
  it('creates and lists meals scoped to a user', () => {
    const userId = randomUUID();
    const m = meal(userId);
    mealService.create(m);
    const list = mealService.listByUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(m.id);
  });

  it('does not leak meals across users', () => {
    const userA = randomUUID();
    const userB = randomUUID();
    mealService.create(meal(userA));
    expect(mealService.listByUser(userB)).toHaveLength(0);
  });

  it('updates an owned meal', () => {
    const userId = randomUUID();
    const m = meal(userId, { mealType: 'lunch' });
    mealService.create(m);
    mealService.update(m.id, userId, { ...m, mealType: 'dinner' });
    expect(mealService.listByUser(userId)[0].mealType).toBe('dinner');
  });

  it('refuses to update another user\u2019s meal (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const m = meal(owner);
    mealService.create(m);
    expect(() => mealService.update(m.id, attacker, m)).toThrow(NotFoundError);
  });

  it('deletes an owned meal', () => {
    const userId = randomUUID();
    const m = meal(userId);
    mealService.create(m);
    mealService.delete(m.id, userId);
    expect(mealService.listByUser(userId)).toHaveLength(0);
  });

  it('refuses to delete another user\u2019s meal (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const m = meal(owner);
    mealService.create(m);
    expect(() => mealService.delete(m.id, attacker)).toThrow(NotFoundError);
  });
});
