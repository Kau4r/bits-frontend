import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Tickets — Phase 1 changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'labtech');
    await page.goto('/tickets');
  });

  test('column header shows "Description", not "Title"', async ({ page }) => {
    // Wait for table area to be present.
    await expect(page.getByText(/issue ticketing/i)).toBeVisible();

    const headerArea = page.locator('div').filter({ has: page.getByText('Description', { exact: true }) }).first();
    await expect(headerArea).toBeVisible();

    // Old "Title" header should be gone from the headers row.
    const titleHeader = page.getByRole('button', { name: /^Title$/ });
    await expect(titleHeader).toHaveCount(0);
  });

  test('status filter is in process order: Pending → In Progress → Resolved', async ({ page }) => {
    // Click the FloatingSelect by its placeholder/label.
    const filterTrigger = page.locator('#ticket-status-filter, [id^="ticket-status-filter"]').first();
    await filterTrigger.click().catch(async () => {
      // Fallback: click the closest combobox/listbox trigger
      await page.getByRole('combobox').filter({ hasText: /status/i }).first().click();
    });

    // The visible options should appear in this order.
    const options = page.getByRole('option');
    await expect(options.nth(0)).toContainText(/all/i);
    await expect(options.nth(1)).toContainText(/pending/i);
    await expect(options.nth(2)).toContainText(/in progress/i);
    await expect(options.nth(3)).toContainText(/resolved/i);
  });
});
