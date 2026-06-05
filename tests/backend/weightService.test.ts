import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStorage } from '../../server/storage.js';
import { closeDatabase } from '../../server/db/database.js';
import { weightService } from '../../server/services/weightService.js';
import { NotFoundError } from '../../server/errors.js';
import type { WeightRecord } from '../../server/repositories/weightRepository.js';

let dataDir: string;

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitpal-weightsvc-'));
  initStorage(dataDir);
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function weight(userId: string, overrides: Partial<WeightRecord> = {}): WeightRecord {
  return {
    id: randomUUID(),
    userId,
    date: new Date().toISOString(),
    weight: 80,
    ...overrides,
  };
}

describe('weightService', () => {
  it('creates and lists weights scoped to a user', () => {
    const userId = randomUUID();
    const w = weight(userId);
    weightService.create(w);
    const list = weightService.listByUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(w.id);
  });

  it('does not leak weights across users', () => {
    const userA = randomUUID();
    const userB = randomUUID();
    weightService.create(weight(userA));
    expect(weightService.listByUser(userB)).toHaveLength(0);
  });

  it('updates an owned weight', () => {
    const userId = randomUUID();
    const w = weight(userId, { weight: 80 });
    weightService.create(w);
    weightService.update(w.id, userId, { ...w, weight: 78 });
    expect(weightService.listByUser(userId)[0].weight).toBe(78);
  });

  it('refuses to update another user\u2019s weight (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const w = weight(owner);
    weightService.create(w);
    expect(() => weightService.update(w.id, attacker, w)).toThrow(NotFoundError);
  });

  it('deletes an owned weight', () => {
    const userId = randomUUID();
    const w = weight(userId);
    weightService.create(w);
    weightService.delete(w.id, userId);
    expect(weightService.listByUser(userId)).toHaveLength(0);
  });

  it('refuses to delete another user\u2019s weight (NotFoundError)', () => {
    const owner = randomUUID();
    const attacker = randomUUID();
    const w = weight(owner);
    weightService.create(w);
    expect(() => weightService.delete(w.id, attacker)).toThrow(NotFoundError);
  });
});
