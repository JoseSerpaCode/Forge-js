import { test } from '@playwright/test';

test('dump console errors', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`PAGE EXCEPTION: ${err.message}`);
  });
  await page.goto('http://localhost:4321/w/SYS/p/dummy');
  // Wait a bit
  await page.waitForTimeout(2000);
});
