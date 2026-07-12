import { test, expect } from '@playwright/test';
import db from '../../src/lib/db';

test('Knowledge Base: Create, auto-save and cascading delete', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserNotionA');
  await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
  
  // Navigate to KB of ws-notion-a
  await page.goto('/w/notion-ws-a/p');
  
  // Click New Page
  await page.click('#btn-new-root-page');
  
  // Should redirect to the new page id
  await page.waitForURL(/\/w\/notion-ws-a\/p\/.+/);
  
  // Change title and content
  const titleInput = page.locator('#editor-title');
  await page.waitForTimeout(500);
  await titleInput.fill('My First Page');
  
  await page.waitForSelector('.ce-paragraph');
  await page.locator('.ce-paragraph').first().click();
  // We use innerHTML to simulate malicious pasted/injected HTML, as keyboard.type escapes it
  await page.evaluate(() => {
    const el = document.querySelector('.ce-paragraph');
    if (el) {
      el.innerHTML = 'Hello world <script>alert(1)</script> <a href="javascript:alert(2)">test</a>';
      el.dispatchEvent(new Event('input', { bubbles: true })); // Trigger debounceSave
    }
  });
  
  // Wait for auto-save (debounce is 1s, we wait 2s)
  await expect(page.locator('#save-status')).toHaveText('Saved', { timeout: 3000 });
  
  // Verify in DB
  const pages = db.prepare('SELECT * FROM pages WHERE workspace_id = ? ORDER BY created_at DESC').all('ws-notion-a') as any[];
  expect(pages.length).toBe(1);
  expect(pages[0].title).toBe('My First Page');
  expect(pages[0].content_json).toContain('Hello world');
  expect(pages[0].content_json).not.toContain('<script>');
  expect(pages[0].content_json).not.toContain('javascript:alert(2)');
  // Ensure the link text survived but without the malicious href (Editor.js strips invalid a tags natively before saving)
  expect(pages[0].content_json).toContain('test');
  expect(pages[0].content_json).not.toContain('<a href');
  
  // SLASH COMMAND TEST
  // Move to a new line, ensure focus, and type /
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500); // Wait for Editor.js to create the new block
  await page.evaluate(() => {
    const p = document.querySelectorAll('.ce-paragraph')[1];
    if (p) {
      p.textContent = '/';
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.getElementById('page-editor')?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: '/' }));
    }
  });
  
  // Wait for popup and click the Header H1 option
  await page.waitForSelector('.slash-menu-item[data-type="header"][data-level="1"]', { state: 'visible' });
  await page.click('.slash-menu-item[data-type="header"][data-level="1"]');
  
  // Type header text
  await page.keyboard.type('My Header');
  
  // Wait for save
  await expect(page.locator('#save-status')).toHaveText('Unsaved changes...');
  await expect(page.locator('#save-status')).toHaveText('Saved', { timeout: 5000 });
  
  // Verify DB contains a header block
  const updatedPages = db.prepare('SELECT * FROM pages WHERE id = ?').get(pages[0].id) as any;
  const parsedContent = JSON.parse(updatedPages.content_json);
  const headerBlock = parsedContent.blocks.find((b: any) => b.type === 'header');
  expect(headerBlock).toBeDefined();
  expect(headerBlock.data.text).toBe('My Header');
  expect(headerBlock.data.level).toBe(1);

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
