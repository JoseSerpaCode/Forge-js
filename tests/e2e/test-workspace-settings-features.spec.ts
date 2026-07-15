import { test, expect } from '@playwright/test';

test.describe('Workspace Settings Features', () => {
  test('Delete workspace confirmation modal works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Go directly to test-workspace settings
    await page.goto(`/w/test-workspace/settings`);
    await page.waitForLoadState('networkidle');
    
    // Check for audit logs container
    await expect(page.locator('#audit-logs-container')).toBeVisible({ timeout: 5000 });
    
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
