import { type Page, expect } from '@playwright/test';

/**
 * Test credentials. Format matches the seed data: `<role>` / `<role>123`.
 * Override via env vars (E2E_LABTECH_USER etc) if your seed differs.
 */
export const TEST_USERS = {
  labtech: {
    username: process.env.E2E_LABTECH_USER || 'labtech',
    password: process.env.E2E_LABTECH_PASS || 'labtech123',
  },
  labhead: {
    username: process.env.E2E_LABHEAD_USER || 'labhead',
    password: process.env.E2E_LABHEAD_PASS || 'labhead123',
  },
  faculty: {
    username: process.env.E2E_FACULTY_USER || 'faculty',
    password: process.env.E2E_FACULTY_PASS || 'faculty123',
  },
  secretary: {
    username: process.env.E2E_SECRETARY_USER || 'secretary',
    password: process.env.E2E_SECRETARY_PASS || 'secretary123',
  },
  sysad: {
    username: process.env.E2E_SYSAD_USER || 'sysad',
    password: process.env.E2E_SYSAD_PASS || 'sysad123',
  },
} as const;

export type Role = keyof typeof TEST_USERS;

/**
 * Log in via the form on /login. Throws if the post-login URL is still /login.
 * Tests should call this in beforeEach unless they're testing the login UX itself.
 */
export async function login(page: Page, role: Role = 'labtech'): Promise<void> {
  const creds = TEST_USERS[role];
  await page.goto('/login');
  await page.getByLabel(/username or email/i).fill(creds.username);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect away from /login.
  await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login$/);
}
