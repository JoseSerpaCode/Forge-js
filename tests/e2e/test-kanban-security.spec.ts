import { test, expect } from '@playwright/test';
import { getTestDb } from './test-utils';

test.describe('Kanban Security & Move Endpoint', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Caso D: Reorder with non-existent sprint_id returns 400', async ({ page }) => {
    // We assume test-kanban-issue-1 exists from reset-db.ts in ws-jose-test.
    const response = await page.request.patch('/api/issues/test-kanban-issue-1/move', {
      data: {
        status: 'in_progress',
        position: 150000,
        sprint_id: 'sprint-no-existe-12345'
      }
    });
    
    console.log(`Caso D status code: ${response.status()}`);
    expect(response.status()).toBe(400);
  });
});
