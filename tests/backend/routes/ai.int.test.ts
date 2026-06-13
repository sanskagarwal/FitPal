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
  getMealInsight: vi.fn(async () => ({
    assessment: 'Light on protein.',
    shortfalls: [{ nutrient: 'protein', note: 'Add a protein source.' }],
    improveThisMeal: ['Add a katori of dal.'],
    makeUp: [{ mealType: 'dinner', suggestion: 'Include paneer or eggs.' }],
  })),
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
});

describe('POST /api/ai/meal-insight', () => {
  const validBody = {
    mealType: 'lunch',
    consumed: { calories: 500, protein: 20, carbs: 70, fats: 15, fiber: 5 },
    target: { calories: 750, protein: 45, carbs: 95, fats: 20, fiber: 8 },
    laterMealTypes: ['evening-snack', 'dinner'],
    dietPreference: 'vegetarian',
  };

  it('requires authentication', async () => {
    const res = await request(ctx.app).post('/api/ai/meal-insight').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns the structured insight for a valid request', async () => {
    const res = await alice.agent.post('/api/ai/meal-insight').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.assessment).toBeTypeOf('string');
    expect(res.body.improveThisMeal).toBeInstanceOf(Array);
    expect(res.body.makeUp[0].mealType).toBe('dinner');
  });

  it('rejects an unknown meal type with a 400', async () => {
    const res = await alice.agent.post('/api/ai/meal-insight').send({ ...validBody, mealType: 'brunch' });
    expect(res.status).toBe(400);
  });

  it('rejects negative macro values with a 400', async () => {
    const res = await alice.agent
      .post('/api/ai/meal-insight')
      .send({ ...validBody, consumed: { ...validBody.consumed, protein: -5 } });
    expect(res.status).toBe(400);
  });
});
