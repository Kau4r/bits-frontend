import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Room QR print — Phase 8', () => {
  test('Items print page renders QR cards', async ({ page, context }) => {
    await login(page, 'labtech');

    // Find a room ID. The labtech RoomPage exposes rooms; pick the first one.
    await page.goto('/labtech/room');
    await expect(page.getByText(/rooms?/i).first()).toBeVisible();

    // Try to navigate directly to a print URL — if no roomId can be discovered,
    // skip rather than fail on missing seed data.
    const firstRoomCard = page.locator('[role="button"]').first();
    if (!(await firstRoomCard.isVisible().catch(() => false))) {
      test.skip(true, 'No rooms in seed data — cannot exercise print page.');
      return;
    }

    // Block window.print() so it doesn't pop a system dialog during the test.
    await context.addInitScript(() => {
      // @ts-expect-error stub print
      window.print = () => undefined;
    });

    // Navigate directly via known route — assumes Room_ID = 1 exists.
    // Adjust if your seed uses a different ID.
    await page.goto('/labtech/room/1/print-qr?kind=items');

    await expect(page.locator('.qr-print-root')).toBeVisible();
    // Either we see a "no items" message or QR cards.
    const noItems = await page.getByText(/no items? found/i).isVisible().catch(() => false);
    if (noItems) {
      test.skip(true, 'Room 1 has no items — seed required for full assertion.');
      return;
    }
    // At least one QR card.
    expect(await page.locator('.qr-print-card').count()).toBeGreaterThan(0);
  });
});
