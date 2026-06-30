import { test, expect, registerViaUi } from './fixtures';

test.describe('authentication', () => {
  test('register, logout and log back in', async ({ page }) => {
    const user = await registerViaUi(page);

    // The authenticated shell is visible.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

    // Log out -> back to the auth screen (register toggle is present there).
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();

    // Auth screen defaults to login mode; fill and submit.
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email').fill('nobody@example.com');
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
  });
});
