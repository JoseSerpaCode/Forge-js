import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';

test('Search dropdown does not hide when clicking hint', async ({ page }) => {
  // 1. Setup session in DB
  const dbPath = path.resolve('forge.db');
  const db = new Database(dbPath);
  
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!user) throw new Error('No user found to test with');
  
  const sessionId = 'test-session-12345';
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime("now", "+1 day"))').run(sessionId, user.id);
  
  // 2. Set cookie
  await page.context().addCookies([
    {
      name: 'forge_session',
      value: sessionId,
      domain: 'localhost',
      path: '/',
    }
  ]);
  
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:4321/w/proyect-orion');
  
  // 3. Test the search bar
  await page.click('#global-search');
  
  // The dropdown should appear with hints
  await expect(page.locator('#search-dropdown')).toBeVisible();
  await expect(page.locator('a.search-item[data-type="hint"]').first()).toBeVisible();
  
  // Get the first hint
  const firstHint = page.locator('a.search-item[data-type="hint"]').first();
  await firstHint.click();
  
  // IMPORTANT: The dropdown should NOT be hidden after clicking
  await page.waitForTimeout(500); // Give it a moment to possibly fail
  await expect(page.locator('#search-dropdown')).toBeVisible();
  
  // Cleanup
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
});
