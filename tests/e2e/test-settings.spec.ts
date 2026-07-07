import { test, expect } from '@playwright/test';

test('Save profile crash', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
  
  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'Jose');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000); // wait for redirect
  
  await page.goto('http://localhost:4321/settings');
  await page.click('#btn-save-settings');
  await page.waitForTimeout(1000);
  
  await page.goto('http://localhost:4321/w/test-workspace/board');
  await page.waitForTimeout(1000);
  await page.waitForTimeout(2000);
});
