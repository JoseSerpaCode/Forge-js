import { test, expect } from '@playwright/test';

test('Settings regression: Sidebar handles missing workspace and navigates successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserSettings');
  await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/); 
  
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  
  // Verify that NO link has href="#"
  const links = await page.locator('nav a').all();
  for (const link of links) {
    const href = await link.getAttribute('href');
    expect(href).not.toBe('#');
  }

  // Change username and save
  await page.fill('#username-input', 'TestUserSettings2');
  await page.click('#btn-save-settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // wait for reload
  
  // Now click a link in the sidebar
  const sidebarLink = page.locator('nav a').first();
  await sidebarLink.click();
  
  // It should navigate away from /settings
  await page.waitForLoadState('networkidle');
  expect(page.url()).not.toContain('/settings');
});
