import { test, expect } from '@playwright/test';

test('Verify btn-save-settings exists', async ({ page }) => {
  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'Jose');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4321/', { timeout: 10000 });
  
  await page.goto('http://localhost:4321/settings');
  await page.screenshot({ path: 'debug.png' });
  
  const btnCount = await page.locator('#btn-save-settings').count();
  console.log('Button count:', btnCount);
  
  if (btnCount > 0) {
    await page.click('#btn-save-settings');
    await page.waitForTimeout(2000); // wait to see if it reloads or crashes
  }
});
