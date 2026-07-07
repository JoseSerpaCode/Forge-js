import { test, expect } from '@playwright/test';

test('Sidebar active states toggle correctly', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserSidebar');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
  
  // Go to Dashboard
  await page.goto('/w/test-workspace');
  await page.waitForLoadState('networkidle');
  
  // Dashboard link should be active, Kanban should not
  const dashboardLink = page.locator('nav a', { hasText: 'Dashboard' });
  const kanbanLink = page.locator('nav a', { hasText: 'Kanban Board' });
  
  await expect(dashboardLink).toHaveClass(/text-forge-neon/);
  await expect(kanbanLink).not.toHaveClass(/text-forge-neon/);
  
  // Click Kanban Board
  await kanbanLink.click();
  await page.waitForLoadState('networkidle');
  
  // Now Kanban should be active, Dashboard should not
  await expect(kanbanLink).toHaveClass(/text-forge-neon/);
  await expect(dashboardLink).not.toHaveClass(/text-forge-neon/);
});
