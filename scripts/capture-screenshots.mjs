import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs', 'images');

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const EMAIL = process.env.FITPAL_EMAIL;
const PASSWORD = process.env.FITPAL_PASSWORD;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});

await context.addInitScript(() => {
  window.localStorage.setItem('fitpal-theme', 'dark');
});

const page = await context.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1. Login / front page (logged out)
await page.screenshot({ path: join(docsDir, 'login.png') });
console.log('captured login');

// Authenticate
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);

const pages = [
  { label: 'Dashboard', file: 'dashboard.png' },
  { label: 'Log Food', file: 'log-food.png' },
  { label: 'Weight', file: 'weight.png' },
  { label: 'Goals', file: 'goals.png' },
  { label: 'Recipes', file: 'recipes.png' },
];

for (const { label, file } of pages) {
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(docsDir, file) });
  console.log('captured', file);
}

// Profile page (button shows the user's name)
const profileBtn = page.locator('header button').filter({ hasText: /.+/ }).nth(0);
try {
  await page.locator('header').getByRole('button').filter({ hasNotText: /Dashboard|Log Food|Weight|Goals|Recipes|Logout/ }).first().click();
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(docsDir, 'profile.png') });
  console.log('captured profile.png');
} catch (e) {
  console.log('profile capture skipped:', e.message);
}

await browser.close();
console.log('done');
