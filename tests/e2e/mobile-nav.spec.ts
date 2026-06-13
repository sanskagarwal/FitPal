import { test, expect, registerViaUi } from './fixtures';

// Mobile viewport (iPhone 12-ish). At < md the desktop top nav is display:none
// and the bottom navigation bar takes over.
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('mobile bottom navigation', () => {
  test('switch pages via the bottom tab bar and the More sheet', async ({ page }) => {
    // Register at the default desktop viewport (the helper waits for the
    // desktop-only Logout button), then shrink to a phone size.
    await registerViaUi(page);
    await page.setViewportSize(MOBILE_VIEWPORT);

    // Desktop Logout button is hidden on mobile; the bottom nav is shown.
    await expect(page.getByRole('button', { name: 'Logout' })).toBeHidden();

    // Navigate to Weight via the bottom tab bar.
    await page.getByRole('button', { name: 'Weight' }).click();
    await expect(page.getByRole('heading', { name: 'Log Your Weight' })).toBeVisible();

    // Navigate to Goals.
    await page.getByRole('button', { name: 'Goals' }).click();
    await expect(page.getByRole('heading', { name: 'Your Goals' })).toBeVisible();

    // Open the More sheet and jump to Recipes.
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Recipes' }).click();
    await expect(page.getByRole('heading', { name: 'Recipe Suggestions' })).toBeVisible();

    // Back to the Dashboard from the bottom bar.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('button', { name: 'Log Food' })).toBeVisible();
  });

  test('log out from the More sheet', async ({ page }) => {
    await registerViaUi(page);
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Logout' }).click();

    // Back to the auth screen.
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });
});
