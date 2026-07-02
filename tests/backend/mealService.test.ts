import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStorage } from '../../server/storage.js';
import { closeDatabase } from '../../server/db/database.js';
import { mealService } from '../../server/services/mealService.js';
import { mealImageRepository } from '../../server/repositories/mealImageRepository.js';
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
  it('refuses to update another user\u2019s meal (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const m = meal(owner);
    mealService.create(m);
    expect(() => mealService.update(m.id, attacker, m)).toThrow(NotFoundError);
  });

  it('refuses to delete another user\u2019s meal (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const m = meal(owner);
    mealService.create(m);
    expect(() => mealService.delete(m.id, attacker)).toThrow(NotFoundError);
  });
});

describe('mealService meal images', () => {
  const image = { mime: 'image/jpeg', buffer: Buffer.from([1, 2, 3, 4]) };

  it('stores an image alongside the meal and fetches it back', () => {
    const userId = randomUUID();
    const m = meal(userId);
    mealService.create(m, image);
    const got = mealService.getImage(m.id, userId);
    expect(got?.mime).toBe('image/jpeg');
    expect(got?.image.equals(image.buffer)).toBe(true);
  });

  it('returns null for a meal with no image', () => {
    const userId = randomUUID();
    const m = meal(userId);
    mealService.create(m);
    expect(mealService.getImage(m.id, userId)).toBeNull();
  });

  it('does not leak images across users', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const m = meal(owner);
    mealService.create(m, image);
    expect(mealService.getImage(m.id, attacker)).toBeNull();
  });

  it('cascade-deletes the image when its meal is deleted', () => {
    const userId = randomUUID();
    const m = meal(userId);
    mealService.create(m, image);
    expect(mealService.getImage(m.id, userId)).not.toBeNull();
    mealService.delete(m.id, userId);
    expect(mealImageRepository.get(m.id, userId)).toBeNull();
  });
});
