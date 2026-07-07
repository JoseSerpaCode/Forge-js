import { test, expect } from '@playwright/test';

test('smoke: login redirige correctamente', async ({ page }) => {
  page.on('response', response => {
    if (response.url().includes('/api/auth/login') && response.request().method() === 'POST') {
      console.log('LOGIN POST STATUS:', response.status());
    }
  });

  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'Jose');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4321/', { timeout: 10000 });
});
