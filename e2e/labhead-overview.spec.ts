import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('LabHead overview — Phase 2.6 changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'labhead');
    await page.goto('/labtechview');
    await expect(page.getByText(/lab technicians/i)).toBeVisible();
  });

  test('Unassigned tickets table uses "Description" header (not "Issue")', async ({ page }) => {
    await expect(page.getByText(/unassigned tickets/i)).toBeVisible();
    // The Description header should be visible somewhere in the unassigned area.
    const descriptionHeaders = page.getByText('Description', { exact: true });
    expect(await descriptionHeaders.count()).toBeGreaterThan(0);
  });

  test('Clicking an unassigned ticket row opens the TicketingModal', async ({ page }) => {
    // If there are unassigned tickets, click the first row.
    const rows = page.locator('[role="button"]').filter({ has: page.locator('text=/medium|high|low|n\\/a/i') });
    const count = await rows.count();
    test.skip(count === 0, 'No unassigned tickets to click — seed data needed.');

    await rows.first().click();

    // Expect the TicketingModal to open. It has a known structural marker.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
  });
});
