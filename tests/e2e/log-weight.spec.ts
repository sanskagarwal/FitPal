import { test, expect, registerViaUi } from './fixtures';

test.describe('weight tracking', () => {
  test('log a new weight entry and see it recorded', async ({ page }) => {
    await registerViaUi(page);

    await page.getByRole('button', { name: 'Weight' }).click();
    await expect(page.getByRole('heading', { name: 'Log Your Weight' })).toBeVisible();

    await page.getByPlaceholder('e.g., 70.5').fill('78.4');
    await page.getByRole('button', { name: 'Log Weight' }).click();

    // The new value shows up somewhere in the weight tracker (history/stats).
    await expect(page.getByText('78.4', { exact: false }).first()).toBeVisible();
  });
});
