import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Verifies that getModel() selects the correct AI SDK provider from AI_PROVIDER.
// The real SDK factories only build a model descriptor (no network call at
// construction), so we assert on the resulting model's `provider`/`modelId`
// rather than mocking the SDK packages (which Vite inlines, defeating vi.mock).
// getModel caches its result, so we reset modules between cases to re-run the
// selection with fresh env.

const ORIGINAL_ENV = { ...process.env };

async function loadGetModel() {
  vi.resetModules();
  const { getModel } = await import('../../server/services/aiService.js');
  return getModel;
}

async function loadGetVisionModel() {
  vi.resetModules();
  const { getVisionModel } = await import('../../server/services/aiService.js');
  return getVisionModel;
}

beforeEach(() => {
  process.env.AI_API_KEY = 'k';
  process.env.AI_MODEL = 'test-model';
  delete process.env.AI_BASE_URL;
  delete process.env.AI_API_VERSION;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getModel provider selection', () => {
  it('selects the OpenAI-compatible SDK by default', async () => {
    process.env.AI_PROVIDER = 'openai-compatible';
    process.env.AI_BASE_URL = 'http://localhost/v1';
    const model = (await loadGetModel())();
    expect(model.provider).toBe('fitpal-ai.chat');
    expect(model.modelId).toBe('test-model');
  });

  it('selects the Azure OpenAI SDK', async () => {
    process.env.AI_PROVIDER = 'azure';
    process.env.AI_BASE_URL = 'https://res.openai.azure.com';
    process.env.AI_API_VERSION = '2024-08-01-preview';
    const model = (await loadGetModel())();
    expect(model.provider).toBe('azure.chat');
    expect(model.modelId).toBe('test-model');
  });

  it('selects the native Anthropic SDK without requiring AI_BASE_URL', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    const model = (await loadGetModel())();
    expect(model.provider).toBe('anthropic.messages');
    expect(model.modelId).toBe('test-model');
  });

  it('selects the native Google SDK without requiring AI_BASE_URL', async () => {
    process.env.AI_PROVIDER = 'google';
    const model = (await loadGetModel())();
    expect(model.provider).toBe('google.generative-ai');
    expect(model.modelId).toBe('test-model');
  });

  it('throws for an unsupported provider', async () => {
    process.env.AI_PROVIDER = 'nope';
    const getModel = await loadGetModel();
    expect(() => getModel()).toThrow(/Unsupported AI_PROVIDER/);
  });

  it('throws when AI_BASE_URL is missing for openai-compatible', async () => {
    process.env.AI_PROVIDER = 'openai-compatible';
    const getModel = await loadGetModel();
    expect(() => getModel()).toThrow(/AI_BASE_URL/);
  });

  it('throws when AI_BASE_URL is missing for azure', async () => {
    process.env.AI_PROVIDER = 'azure';
    process.env.AI_API_VERSION = '2024-08-01-preview';
    const getModel = await loadGetModel();
    expect(() => getModel()).toThrow(/AI_BASE_URL/);
  });

  it('throws when AI_API_KEY is missing', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.AI_API_KEY;
    const getModel = await loadGetModel();
    expect(() => getModel()).toThrow(/AI_API_KEY/);
  });
});

describe('getVisionModel', () => {
  it('uses AI_VISION_MODEL when set', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_VISION_MODEL = 'vision-model';
    const model = (await loadGetVisionModel())();
    expect(model.modelId).toBe('vision-model');
  });

  it('falls back to AI_MODEL when AI_VISION_MODEL is unset', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.AI_VISION_MODEL;
    const model = (await loadGetVisionModel())();
    expect(model.modelId).toBe('test-model');
  });

  it('builds the vision model with the configured provider', async () => {
    process.env.AI_PROVIDER = 'google';
    process.env.AI_VISION_MODEL = 'gemini-vision';
    const model = (await loadGetVisionModel())();
    expect(model.provider).toBe('google.generative-ai');
    expect(model.modelId).toBe('gemini-vision');
  });
});
