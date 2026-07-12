import { test, expect } from '@playwright/test';

test.describe('Workspace Settings Features', () => {
  test('Delete workspace confirmation modal works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Go to the first workspace
    await page.waitForSelector('a[href^="/w/"]');
    const wsLinks = page.locator('a[href^="/w/"]');
    const count = await wsLinks.count();
    
    let targetHref = '';
    for (let i = 0; i < count; i++) {
      const href = await wsLinks.nth(i).getAttribute('href');
      if (href && href !== '/w/undefined') {
        targetHref = href;
        break;
      }
    }
    
    if (!targetHref) {
      console.log('No workspace found, skipping test');
      return;
    }

    await page.goto(`${targetHref}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Check for audit logs container
    await expect(page.locator('#audit-logs-container')).toBeVisible();
    
    // Modal Test
    const promptBtn = page.locator('#btn-delete-workspace-prompt');
    await promptBtn.click();
    
    const modal = page.locator('#delete-workspace-modal');
    await expect(modal).toBeVisible();
    
    const confirmInput = page.locator('#delete-workspace-confirm-input');
    const deleteBtn = page.locator('#btn-delete-workspace');
    
    // Initially disabled
    await expect(deleteBtn).toBeDisabled();
    
    // Type wrong name
    await confirmInput.fill('Wrong Name 1234');
    await expect(deleteBtn).toBeDisabled();
    
    // Type correct name (it is in the placeholder)
    const wsName = await confirmInput.getAttribute('placeholder');
    await confirmInput.fill(wsName!);
    await expect(deleteBtn).toBeEnabled();
  });
});
