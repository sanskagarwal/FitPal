import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount any rendered components and reset jsdom between tests so DOM state
// never leaks across test cases.
afterEach(() => {
  cleanup();
});
