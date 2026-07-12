import { test, expect } from '@playwright/test';

test('A1 bug: clicking New Rule button', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="text"]', 'sysadmin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4321/');

  // Create a workspace first or go to an existing one
  await page.goto('http://localhost:4321/w/SYS/settings');

  // Listen to console errors
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  // Click New Rule button
  await page.click('#btn-add-automation');

  // Verify if modal is open
  const modal = page.locator('#add-automation-modal');
  const isOpen = await modal.evaluate(node => (node as HTMLDialogElement).open);
  
  if (errors.length > 0) {
    console.log('ERRORS DETECTED:', errors);
  } else {
    console.log('MODAL IS OPEN:', isOpen);
  }
});
