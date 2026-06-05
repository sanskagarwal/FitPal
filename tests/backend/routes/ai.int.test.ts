import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, registerAgent, type TestApp, type AuthedAgent } from '../helpers.js';

// The AI provider is never called for real. Mock the whole service so the
// routes/controllers are exercised without network or API keys.
vi.mock('../../../server/services/aiService.js', () => ({
  analyzeFoodWithAI: vi.fn(async () => [{ id: 'f1', name: 'Idli', isIndian: true }]),
  reestimateNutrientsForUnit: vi.fn(async () => ({ servingSize: '1 piece', confidence: 'high' })),
  getRecipeSuggestions: vi.fn(async () => [{ name: 'Dal' }]),
  getDietaryInsights: vi.fn(async () => ({ summary: 'ok' })),
  suggestMeal: vi.fn(async () => ({ name: 'Khichdi' })),
  suggestFoodForNutrient: vi.fn(async () => ({ name: 'Spinach' })),
  suggestGoals: vi.fn(async () => ({ targetCalories: 2000 })),
  chatLogMeal: vi.fn(async () => ({ message: 'logged' })),
  chatLogMealStream: vi.fn(async () => ({ message: 'logged' })),
}));

let ctx: TestApp;
let alice: AuthedAgent;

beforeAll(async () => {
  ctx = createTestApp();
  alice = await registerAgent(ctx.app);
});

afterAll(() => {
  ctx.cleanup();
});

describe('AI routes auth', () => {
  it('requires authentication (401) before reaching the AI service', async () => {
    const res = await request(ctx.app).post('/api/ai/analyze-food').send({ foodQuery: 'idli' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/ai/analyze-food', () => {
  it('returns the mocked AI result for an authenticated user', async () => {
    const res = await alice.agent.post('/api/ai/analyze-food').send({ foodQuery: 'idli' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'f1', name: 'Idli', isIndian: true }]);
  });

  it('sets rate-limit headers', async () => {
    const res = await alice.agent.post('/api/ai/recipes').send({ preferences: {}, goals: {} });
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});

describe('AI rate limiting', () => {
  const original = process.env.AI_RATE_LIMIT;

  beforeAll(() => {
    process.env.AI_RATE_LIMIT = '5';
  });
  afterAll(() => {
    process.env.AI_RATE_LIMIT = original;
  });

  it('returns 429 with Retry-After once the window limit is exceeded', async () => {
    let last = await alice.agent.post('/api/ai/analyze-food').send({ foodQuery: 'idli' });
    for (let i = 0; i < 12; i++) {
      last = await alice.agent.post('/api/ai/analyze-food').send({ foodQuery: 'idli' });
    }
    expect(last.status).toBe(429);
    expect(last.headers['retry-after']).toBeDefined();
  });
});
