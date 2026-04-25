import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('smoke', () => {
  test('labtech can log in and lands on a non-login page', async ({ page }) => {
    await login(page, 'labtech');
    await expect(page).not.toHaveURL(/\/login$/);
    // Some authenticated UI should be visible — sidebar or main content.
    await expect(page.locator('body')).toContainText(/dashboard|inventory|tickets|forms|borrowing/i, { timeout: 5_000 });
  });
});
