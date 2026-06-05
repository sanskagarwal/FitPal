import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// End-to-end test configuration.
//
// Runs the real single-process build: `npm run build` produces the SPA, then
// the Express server serves both the static frontend and the /api routes from
// an isolated temp-dir SQLite database. The AI provider is never called for
// real — specs intercept `**/api/ai/**` at the network layer.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3100;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fitpal-e2e-'));

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && cd server && npx tsx index.ts',
    cwd: __dirname,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      // Dev-mode cookies (secure:false) so the browser stores the session over http.
      NODE_ENV: 'test',
      JWT_SECRET: 'e2e-jwt-secret-at-least-16-characters-long',
      DATA_DIR,
      STATIC_DIR: path.join(__dirname, 'dist'),
      // Dummy AI config — provider is mocked at the network layer, never called.
      AI_API_KEY: 'e2e-dummy-key',
      AI_BASE_URL: 'http://localhost/ai',
      AI_MODEL: 'e2e-model',
    },
  },
});
