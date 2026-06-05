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
