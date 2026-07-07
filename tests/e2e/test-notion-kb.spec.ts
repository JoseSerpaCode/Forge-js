import { test, expect } from '@playwright/test';
import db from '../../src/lib/db';

test('Knowledge Base: Create, auto-save and cascading delete', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserNotionA');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
  
  // Navigate to KB of ws-notion-a
  await page.goto('/w/notion-ws-a/p');
  
  // Click New Page
  await page.click('#btn-new-root-page');
  
  // Should redirect to the new page id
  await page.waitForURL(/\/w\/notion-ws-a\/p\/.+/);
  
  // Change title and content
  const titleInput = page.locator('#page-title');
  await titleInput.fill('My First Page');
  
  const editor = page.locator('#page-editor');
  await editor.fill('Hello world content');
  
  // Wait for auto-save (debounce is 1s, we wait 2s)
  await expect(page.locator('#save-status')).toHaveText('Saved', { timeout: 3000 });
  
  // Verify in DB
  const pages = db.prepare('SELECT * FROM pages WHERE workspace_id = ?').all('ws-notion-a') as any[];
  expect(pages.length).toBe(1);
  expect(pages[0].title).toBe('My First Page');
  expect(pages[0].content_json).toContain('Hello world content');
  
  const parentId = pages[0].id;

  // Add subpage via UI
  // Hover over the tree item and click the add child button
  await page.hover('li.pl-4 > div');
  await page.click(`.add-child-btn[data-parent-id="${parentId}"]`);
  
  // Should redirect to new subpage
  await page.waitForURL((url) => url.toString().includes('/p/') && !url.toString().endsWith(parentId));
  
  // Verify in DB that it is a child
  const subpages = db.prepare('SELECT * FROM pages WHERE parent_page_id = ?').all(parentId) as any[];
  expect(subpages.length).toBe(1);
  
  // Delete parent page using API directly or UI. Let's navigate back to parent and delete it
  await page.goto(`/w/notion-ws-a/p/${parentId}`);
  
  page.on('dialog', dialog => dialog.accept());
  await page.click('#btn-delete-page');
  
  // Should redirect back to /p
  await page.waitForURL(/\/w\/notion-ws-a\/p$/);
  
  // Verify DB cascading delete
  const remainingPages = db.prepare('SELECT * FROM pages WHERE workspace_id = ?').all('ws-notion-a') as any[];
  expect(remainingPages.length).toBe(0); // Parent and child should both be gone!
});
