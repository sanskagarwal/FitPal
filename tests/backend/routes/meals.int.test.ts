import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  createTestApp,
  registerAgent,
  buildMeal,
  type TestApp,
  type AuthedAgent,
} from '../helpers.js';

let ctx: TestApp;
let alice: AuthedAgent;
let bob: AuthedAgent;

beforeAll(async () => {
  ctx = createTestApp();
  alice = await registerAgent(ctx.app);
  bob = await registerAgent(ctx.app);
});

afterAll(() => {
  ctx.cleanup();
});

describe('meal routes auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const res = await request(ctx.app).get(`/api/meals/${alice.userId}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/meals', () => {
  it('creates a meal for the authenticated owner', async () => {
    const meal = buildMeal(alice.userId);
    const res = await alice.agent.post('/api/meals').send(meal);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meal.id).toBe(meal.id);
  });

  it('rejects an invalid payload with 400', async () => {
    const meal = buildMeal(alice.userId, { foods: [] });
    const res = await alice.agent.post('/api/meals').send(meal);
    expect(res.status).toBe(400);
  });

  it('forbids creating a meal owned by another user (403)', async () => {
    const meal = buildMeal(bob.userId); // body.userId !== session user
    const res = await alice.agent.post('/api/meals').send(meal);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/meals/:userId', () => {
  it('lists the owner\u2019s meals', async () => {
    const meal = buildMeal(alice.userId);
    await alice.agent.post('/api/meals').send(meal);
    const res = await alice.agent.get(`/api/meals/${alice.userId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((m: { id: string }) => m.id === meal.id)).toBe(true);
  });

  it('forbids listing another user\u2019s meals (403 IDOR guard)', async () => {
    const res = await alice.agent.get(`/api/meals/${bob.userId}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/meals/:userId/range', () => {
  it('returns only meals whose date falls within the range', async () => {
    const inRange = buildMeal(alice.userId, { date: new Date('2026-03-15T08:00:00.000Z').toISOString() });
    const outOfRange = buildMeal(alice.userId, { date: new Date('2025-01-01T08:00:00.000Z').toISOString() });
    await alice.agent.post('/api/meals').send(inRange);
    await alice.agent.post('/api/meals').send(outOfRange);

    const start = new Date('2026-03-01T00:00:00.000Z').toISOString();
    const end = new Date('2026-03-31T23:59:59.999Z').toISOString();
    const res = await alice.agent.get(`/api/meals/${alice.userId}/range?start=${start}&end=${end}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((m: { id: string }) => m.id);
    expect(ids).toContain(inRange.id);
    expect(ids).not.toContain(outOfRange.id);
  });

  it('rejects an invalid date range with 400', async () => {
    const res = await alice.agent.get(`/api/meals/${alice.userId}/range?start=nope&end=nope`);
    expect(res.status).toBe(400);
  });

  it('forbids ranging another user\u2019s meals (403)', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const end = new Date('2026-12-31T23:59:59.999Z').toISOString();
    const res = await alice.agent.get(`/api/meals/${bob.userId}/range?start=${start}&end=${end}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/meals/:id', () => {
  it('updates an owned meal', async () => {
    const meal = buildMeal(alice.userId, { mealType: 'lunch' });
    await alice.agent.post('/api/meals').send(meal);
    const res = await alice.agent
      .put(`/api/meals/${meal.id}`)
      .send({ ...meal, mealType: 'dinner' });
    expect(res.status).toBe(200);
    expect(res.body.meal.mealType).toBe('dinner');
  });

  it('returns 404 when updating a non-existent meal', async () => {
    const meal = buildMeal(alice.userId);
    const res = await alice.agent.put(`/api/meals/${meal.id}`).send(meal);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/meals/:userId/:id', () => {
  it('deletes an owned meal', async () => {
    const meal = buildMeal(alice.userId);
    await alice.agent.post('/api/meals').send(meal);
    const res = await alice.agent.delete(`/api/meals/${alice.userId}/${meal.id}`);
    expect(res.status).toBe(200);
    const list = await alice.agent.get(`/api/meals/${alice.userId}`);
    expect(list.body.some((m: { id: string }) => m.id === meal.id)).toBe(false);
  });

  it('forbids deleting via another user\u2019s id (403)', async () => {
    const meal = buildMeal(alice.userId);
    await alice.agent.post('/api/meals').send(meal);
    const res = await bob.agent.delete(`/api/meals/${alice.userId}/${meal.id}`);
    expect(res.status).toBe(403);
  });
});
