import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { initStorage } from '../../server/storage.js';
import { closeDatabase } from '../../server/db/database.js';
import { createApp } from '../../server/app.js';

// ---------------------------------------------------------------------------
// Integration-test harness.
//
// Each test file builds one app backed by an isolated temp-dir SQLite database
// (Vitest isolates modules per file, so the DB singleton is per-file). Use a
// Supertest `agent` so the auth cookie set by /register or /login is reused on
// subsequent requests.
// ---------------------------------------------------------------------------

export interface TestApp {
  app: Express;
  dataDir: string;
  cleanup(): void;
}

export function createTestApp(): TestApp {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitpal-test-'));
  initStorage(dataDir);
  const app = createApp();
  return {
    app,
    dataDir,
    cleanup() {
      closeDatabase();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    dateOfBirth: '1996-06-05',
    gender: 'male',
    height: 180,
    activityLevel: 'moderate',
    goals: {
      targetWeight: 75,
      targetCalories: 2200,
      targetProtein: 150,
      targetCarbs: 220,
      targetFats: 70,
      targetFiber: 30,
    },
    ...overrides,
  };
}

export interface AuthedAgent {
  agent: ReturnType<typeof request.agent>;
  userId: string;
  email: string;
}

// Register a fresh user through the real /register endpoint and return an agent
// whose cookie jar carries the resulting session.
export async function registerAgent(
  app: Express,
  overrides: { email?: string; password?: string; name?: string } = {}
): Promise<AuthedAgent> {
  const email = overrides.email ?? `user-${randomUUID()}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';

  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name, email, password, profile: validProfile() });

  if (res.status !== 200) {
    throw new Error(`registerAgent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { agent, userId: res.body.user.id as string, email };
}

// Build a valid meal payload owned by `userId`.
export function buildMeal(userId: string, overrides: Record<string, unknown> = {}) {
  const nutrients = {
    calories: 250,
    protein: 12,
    carbs: 30,
    fats: 8,
    fiber: 4,
    sugar: 3,
    sodium: 200,
    vitaminA: 10,
    vitaminC: 5,
    vitaminD: 1,
    calcium: 50,
    iron: 2,
    magnesium: 20,
    potassium: 150,
  };
  return {
    id: randomUUID(),
    userId,
    date: new Date().toISOString(),
    mealType: 'breakfast',
    foods: [
      {
        food: {
          id: randomUUID(),
          name: 'Poha',
          servingSize: '1 katori',
          nutrients,
          isIndian: true,
        },
        quantity: 1,
        unit: 'katori',
        unitQuantity: 1,
      },
    ],
    totalNutrients: nutrients,
    ...overrides,
  };
}

// Build a valid weight payload owned by `userId`.
export function buildWeight(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    userId,
    date: new Date().toISOString(),
    weight: 80,
    bmi: 24.7,
    ...overrides,
  };
}
