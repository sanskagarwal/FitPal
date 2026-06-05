import { test, expect, registerViaUi, MOCK_FOOD } from './fixtures';

test.describe('meal logging (manual + mocked AI search)', () => {
  test('search for a food, add it and log the meal', async ({ page }) => {
    await registerViaUi(page);

    await page.getByRole('button', { name: 'Log Food' }).click();
    await expect(page.getByRole('heading', { name: 'Log Your Meal' })).toBeVisible();

    // Search uses the mocked /api/ai/analyze-food endpoint.
    await page.getByLabel('Search Indian foods').fill('poha');
    await page.getByRole('button', { name: 'Search' }).click();

    // Result appears; add it to the selection.
    await expect(page.getByText('Search Results:')).toBeVisible();
    await page.getByRole('button', { name: `Add ${MOCK_FOOD.name}` }).click();

    // Selected foods + totals show, then log the meal.
    await expect(page.getByRole('heading', { name: 'Selected Foods' })).toBeVisible();
    await page.getByRole('button', { name: 'Log Meal' }).click();

    // The logged meal shows in today's history.
    await expect(page.getByRole('heading', { name: "Today's Meals" })).toBeVisible();
    await expect(page.getByText(MOCK_FOOD.name).first()).toBeVisible();
  });
});
