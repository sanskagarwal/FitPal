import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// All tests live under the single root `tests/` folder. Frontend and backend
// need different environments (jsdom vs node), so they run as two Vitest
// projects distinguished by path. Playwright e2e specs (tests/e2e) run
// separately via `npm run test:e2e`.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'frontend',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/frontend/setup.ts'],
          include: ['tests/frontend/**/*.{test,spec}.{ts,tsx}'],
          css: false,
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          globals: true,
          setupFiles: ['./tests/backend/setup.ts'],
          include: ['tests/backend/**/*.test.ts'],
        },
      },
    ],
  },
});
