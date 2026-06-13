import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  createTestApp,
  registerAgent,
  buildWeight,
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

describe('weight routes auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const res = await request(ctx.app).get(`/api/weights/${alice.userId}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/weights', () => {
  it('creates a weight for the authenticated owner', async () => {
    const weight = buildWeight(alice.userId);
    const res = await alice.agent.post('/api/weights').send(weight);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.weight.id).toBe(weight.id);
  });

  it('rejects a negative weight with 400', async () => {
    const weight = buildWeight(alice.userId, { weight: -5 });
    const res = await alice.agent.post('/api/weights').send(weight);
    expect(res.status).toBe(400);
  });

  it('forbids creating a weight owned by another user (403)', async () => {
    const weight = buildWeight(bob.userId);
    const res = await alice.agent.post('/api/weights').send(weight);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/weights/:userId', () => {
  it('lists the owner\u2019s weights', async () => {
    const weight = buildWeight(alice.userId);
    await alice.agent.post('/api/weights').send(weight);
    const res = await alice.agent.get(`/api/weights/${alice.userId}`);
    expect(res.status).toBe(200);
    expect(res.body.some((w: { id: string }) => w.id === weight.id)).toBe(true);
  });

  it('forbids listing another user\u2019s weights (403 IDOR guard)', async () => {
    const res = await alice.agent.get(`/api/weights/${bob.userId}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/weights/:userId/range', () => {
  it('returns only weights whose date falls within the range', async () => {
    const inRange = buildWeight(alice.userId, { date: new Date('2026-03-15T08:00:00.000Z').toISOString() });
    const outOfRange = buildWeight(alice.userId, { date: new Date('2025-01-01T08:00:00.000Z').toISOString() });
    await alice.agent.post('/api/weights').send(inRange);
    await alice.agent.post('/api/weights').send(outOfRange);

    const start = new Date('2026-03-01T00:00:00.000Z').toISOString();
    const end = new Date('2026-03-31T23:59:59.999Z').toISOString();
    const res = await alice.agent.get(`/api/weights/${alice.userId}/range?start=${start}&end=${end}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((w: { id: string }) => w.id);
    expect(ids).toContain(inRange.id);
    expect(ids).not.toContain(outOfRange.id);
  });

  it('rejects an invalid date range with 400', async () => {
    const res = await alice.agent.get(`/api/weights/${alice.userId}/range?start=nope&end=nope`);
    expect(res.status).toBe(400);
  });

  it('rejects a missing bound with 400', async () => {
    const start = new Date().toISOString();
    const res = await alice.agent.get(`/api/weights/${alice.userId}/range?start=${start}`);
    expect(res.status).toBe(400);
  });

  it('forbids ranging another user\u2019s weights (403)', async () => {
    const start = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const end = new Date('2026-12-31T23:59:59.999Z').toISOString();
    const res = await alice.agent.get(`/api/weights/${bob.userId}/range?start=${start}&end=${end}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/weights/:id', () => {
  it('updates an owned weight', async () => {
    const weight = buildWeight(alice.userId, { weight: 80 });
    await alice.agent.post('/api/weights').send(weight);
    const res = await alice.agent
      .put(`/api/weights/${weight.id}`)
      .send({ ...weight, weight: 78 });
    expect(res.status).toBe(200);
    expect(res.body.weight.weight).toBe(78);
  });

  it('returns 404 when updating a non-existent weight', async () => {
    const weight = buildWeight(alice.userId);
    const res = await alice.agent.put(`/api/weights/${weight.id}`).send(weight);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/weights/:userId/:id', () => {
  it('deletes an owned weight', async () => {
    const weight = buildWeight(alice.userId);
    await alice.agent.post('/api/weights').send(weight);
    const res = await alice.agent.delete(`/api/weights/${alice.userId}/${weight.id}`);
    expect(res.status).toBe(200);
  });

  it('forbids deleting via another user\u2019s id (403)', async () => {
    const weight = buildWeight(alice.userId);
    await alice.agent.post('/api/weights').send(weight);
    const res = await bob.agent.delete(`/api/weights/${alice.userId}/${weight.id}`);
    expect(res.status).toBe(403);
  });
});
