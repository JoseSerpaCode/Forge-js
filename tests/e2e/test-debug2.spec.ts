import { test, expect } from '@playwright/test';
test('debug2', async ({ page }) => {
  await page.goto('/login');
  await page.goto('/settings');
  await expect(page).toHaveURL(/.*\/w\/guest-.*/);
  await page.goto('/login');
  console.log("Current URL:", page.url());
});
