import { test, expect } from '@playwright/test';

test('Sidebar active states toggle correctly', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserSidebar');
  await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
  
  // Go to Dashboard
  await page.goto('/w/test-workspace');
  await page.waitForLoadState('networkidle');
  
  // Dashboard link should be active, Kanban should not
  const dashboardLink = page.locator('nav a', { hasText: 'Dashboard' });
  const kanbanLink = page.locator('nav a', { hasText: 'Kanban Board' });
  
  await expect(dashboardLink).toHaveClass(/active/);
  await expect(kanbanLink).not.toHaveClass(/active/);
  
  // Click Kanban Board
  await kanbanLink.click();
  await page.waitForURL('**/board');
  
  // Verify classes swapped
  await expect(kanbanLink).toHaveClass(/active/);
  await expect(dashboardLink).not.toHaveClass(/active/);
});
