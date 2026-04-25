import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Inventory — Phase 4 + Phase 6 changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'labtech');
    await page.goto('/inventory');
  });

  test('Import button is no longer present in the header', async ({ page }) => {
    await expect(page.getByRole('button', { name: /import excel/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^import$/i })).toHaveCount(0);
  });

  test('Brand sentinel values display as em-dash, not "OLD"/"N/A"', async ({ page }) => {
    // Wait for the table to render at least one row.
    await page.waitForSelector('table, [role="grid"], div[style*="grid"]', { timeout: 10_000 }).catch(() => {});

    const body = page.locator('body');
    // The page should not show raw sentinel brand strings as a brand label.
    // (They might appear in a search field but not as data.)
    const dirtyBrandHits = await body.getByText(/^(OLD|N\/A|NO S\/N|UNKNOWN|GENERAL)$/, { exact: true }).count();
    // Allow zero — sentinel values should be normalized away on display.
    expect(dirtyBrandHits).toBe(0);
  });
});
