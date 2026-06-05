import { test as base, expect, type Page } from '@playwright/test';

// Full nutrient bag so a saved meal passes the backend's bounded-nutrient
// validation (all 14 fields finite and non-negative).
export const MOCK_NUTRIENTS = {
  calories: 180,
  protein: 6,
  carbs: 30,
  fats: 4,
  fiber: 3,
  sugar: 2,
  sodium: 200,
  vitaminA: 10,
  vitaminC: 5,
  vitaminD: 1,
  calcium: 40,
  iron: 2,
  magnesium: 20,
  potassium: 150,
};

export const MOCK_FOOD = {
  id: 'mock-poha',
  name: 'Poha',
  servingSize: '1 katori',
  nutrients: MOCK_NUTRIENTS,
  isIndian: true,
  confidence: 'high' as const,
};

const MOCK_INSIGHTS = {
  summary: 'Keep up the steady, balanced eating.',
  recommendations: [
    { title: 'Prioritise protein', detail: 'Include dal or paneer.', category: 'protein' },
  ],
};

// Intercept every AI endpoint so no test ever reaches a real provider. The flows
// only depend on /analyze-food and /insights; everything else returns an empty
// object to keep the network deterministic.
export async function mockAi(page: Page): Promise<void> {
  await page.route('**/api/ai/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/analyze-food')) {
      await route.fulfill({ json: [MOCK_FOOD] });
      return;
    }
    if (url.includes('/insights')) {
      await route.fulfill({ json: MOCK_INSIGHTS });
      return;
    }
    await route.fulfill({ json: {} });
  });
}

export interface RegisteredUser {
  name: string;
  email: string;
  password: string;
}

// Register a brand-new user through the UI and wait for the authenticated shell.
export async function registerViaUi(page: Page): Promise<RegisteredUser> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const user: RegisteredUser = {
    name: 'E2E User',
    email: `e2e-${unique}@example.com`,
    password: 'password123',
  };

  await page.goto('/');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByPlaceholder('Full Name').fill(user.name);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.locator('input[type="date"]').fill('1996-06-05');
  await page.getByLabel('Gender').selectOption('male');
  await page.getByPlaceholder('Height (cm)').fill('180');
  await page.getByPlaceholder('Current Weight (kg)').fill('80');
  await page.getByLabel('Activity level').selectOption('moderate');

  await page.getByRole('button', { name: 'Create Account' }).click();

  // Authenticated shell shows the nav + logout.
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  return user;
}

// A fixture that pre-mocks AI for every test.
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockAi(page);
    await use(page);
  },
});

export { expect };
