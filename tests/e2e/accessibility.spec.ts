import AxeBuilder from '@axe-core/playwright';
import { test, expect, registerViaUi } from './fixtures';
import type { Page } from '@playwright/test';

// Accessibility checks focused on color contrast (WCAG AA) across both the
// light and dark themes. The app derives its theme from `prefers-color-scheme`,
// so each page is scanned twice via page.emulateMedia({ colorScheme }).

type Scheme = 'light' | 'dark';
const SCHEMES: Scheme[] = ['light', 'dark'];

// Run the axe color-contrast rule against the current page and assert there are
// no violations. Disabled/inactive controls are excluded because WCAG 1.4.3
// exempts them from contrast requirements (their muted appearance is intended).
// Violations are surfaced with their target selectors to make failures actionable.
async function expectNoContrastViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  const violations = results.violations
    .map((v) => ({
      ...v,
      nodes: v.nodes.filter((n) => !/\sdisabled(=|\s|>)/.test(n.html)),
    }))
    .filter((v) => v.nodes.length > 0);

  const details = violations
    .flatMap((v) => v.nodes.map((n) => `${label}: ${n.target.join(' ')} - ${n.failureSummary ?? ''}`))
    .join('\n');

  expect(violations, details || `${label}: contrast violations found`).toEqual([]);
}

test.describe('color contrast (WCAG AA)', () => {
  test('auth page has sufficient contrast in light and dark', async ({ page }) => {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
      await expectNoContrastViolations(page, `auth (${scheme})`);
    }
  });

  test('authenticated pages have sufficient contrast in light and dark', async ({ page }) => {
    const user = await registerViaUi(page);

    const pages: { name: string; heading: RegExp }[] = [
      { name: 'Dashboard', heading: /Dashboard/ },
      { name: 'Log Food', heading: /Log Your Meal/ },
      { name: 'Weight', heading: /Weight Tracker/ },
      { name: 'Goals', heading: /Your Goals/ },
      { name: 'Recipes', heading: /Recipe Suggestions/ },
      { name: user.name, heading: /Your Profile/ },
    ];

    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const { name, heading } of pages) {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
        // Let the page-transition fade (opacity 0 -> 1) settle so axe doesn't
        // sample blended colors mid-animation.
        await page.waitForTimeout(400);
        await expectNoContrastViolations(page, `${name} (${scheme})`);
      }
    }
  });
});
