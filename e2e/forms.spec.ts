import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Forms module — Phase 2 + 2.5 changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'labtech');
    await page.goto('/forms');
    await expect(page.getByText(/form management/i)).toBeVisible();
  });

  test('Add Form dialog locks status to Pending (no select)', async ({ page }) => {
    await page.getByRole('button', { name: /add form/i }).click();

    // Locked status badge appears in place of the old select.
    const locked = page.getByTestId('add-form-status-locked');
    await expect(locked).toBeVisible();
    await expect(locked).toContainText(/pending/i);
    await expect(locked).toContainText(/editable after creation/i);

    // The old status select should not exist.
    await expect(page.locator('#add-form-status')).toHaveCount(0);
  });

  test('Add Form dialog requires a file attachment', async ({ page }) => {
    await page.getByRole('button', { name: /add form/i }).click();

    // Required asterisk should be next to "Attach File".
    const attachLabel = page.locator('label').filter({ hasText: /attach file/i }).first();
    await expect(attachLabel).toContainText('*');

    // Fill required fields, leave file unattached, submit, expect file error.
    await page.getByPlaceholder(/enter form title/i).fill('E2E test form');
    await page.getByPlaceholder(/enter form number/i).fill('001');
    await page.getByPlaceholder(/name of the person requesting/i).fill('Tester');

    await page.getByRole('button', { name: /track form/i }).click();

    await expect(page.getByText(/please attach the wrf or ris copy/i)).toBeVisible();
  });

  test('Status filter shows Signed and Completed as distinct options', async ({ page }) => {
    const statusFilter = page.locator('#forms-status-filter').first();
    await statusFilter.click();

    const options = page.getByRole('option');
    // All Statuses · Pending · In Review · Signed · Completed · Cancelled
    await expect(options).toHaveCount(6);
    await expect(options.nth(0)).toContainText(/all statuses/i);
    await expect(options.nth(1)).toContainText(/pending/i);
    await expect(options.nth(2)).toContainText(/in review/i);
    await expect(options.nth(3)).toContainText(/^signed$/i);
    await expect(options.nth(4)).toContainText(/^completed$/i);
    await expect(options.nth(5)).toContainText(/cancelled/i);
  });
});
