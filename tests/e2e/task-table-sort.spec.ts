import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';

test('Task Table sorting functionality', async ({ page }) => {
  // 1. Setup session in DB
  const dbPath = path.resolve('forge.db');
  const db = new Database(dbPath);
  
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
  if (!user) throw new Error('No user found to test with');
  
  const sessionId = 'test-session-task-table';
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(sessionId, user.id);
  
  // 2. Set cookie
  await page.context().addCookies([
    {
      name: 'forge_session',
      value: sessionId,
      domain: 'localhost',
      path: '/',
    }
  ]);
  
  console.log('Navigating to hub...');
  await page.goto('http://localhost:4321/');
  
  // Wait for the task table to be visible
  await expect(page.locator('.task-table-container')).toBeVisible();

  // Test sorting by name
  const nameHeader = page.locator('th[data-sort="name"]');
  await nameHeader.click();
  
  // Get all rows text for the name column
  let names = await page.locator('.task-table-body tr.task-row td:nth-child(2) a').allTextContents();
  names = names.map(n => n.trim().toLowerCase());
  
  // Check if they are sorted ascending
  let isSortedAsc = true;
  for (let i = 0; i < names.length - 1; i++) {
    if (names[i] > names[i+1]) {
      isSortedAsc = false;
      break;
    }
  }
  expect(isSortedAsc).toBeTruthy();

  // Click again to sort descending
  await nameHeader.click();
  
  names = await page.locator('.task-table-body tr.task-row td:nth-child(2) a').allTextContents();
  names = names.map(n => n.trim().toLowerCase());
  
  // Check if they are sorted descending
  let isSortedDesc = true;
  for (let i = 0; i < names.length - 1; i++) {
    if (names[i] < names[i+1]) {
      isSortedDesc = false;
      break;
    }
  }
  expect(isSortedDesc).toBeTruthy();
  
  // Cleanup
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
});
