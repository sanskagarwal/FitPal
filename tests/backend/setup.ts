// Test environment bootstrap. Runs before any server module is imported, so the
// required env vars are present when env.ts validates them at import time (it
// calls process.exit(1) on a missing JWT_SECRET). AI_* are dummy values — the
// AI provider itself is always mocked in tests, never called for real.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-16-characters-long';
process.env.AI_PROVIDER ??= 'openai-compatible';
process.env.AI_API_KEY ??= 'test-ai-key';
process.env.AI_BASE_URL ??= 'http://localhost/ai';
process.env.AI_MODEL ??= 'test-model';
