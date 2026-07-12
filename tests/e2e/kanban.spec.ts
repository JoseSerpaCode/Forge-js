import { test, expect } from '@playwright/test';

test.describe('Kanban UI Flow', () => {
  test.skip('Debe permitir arrastrar una tarjeta a In Progress y persistir en la DB', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
    await page.click('button[type="submit"]');
    
    // Redirects to / and then we go to the board
    await page.waitForURL('**/');
    await page.goto('/w/test-workspace/board');
    
    // Simular Drag & Drop
    const card = page.locator('.issue-card').first();
    const targetColumn = page.locator('.board-column[data-status="in_progress"] .column-content');
    
    // Setup request promise BEFORE dragging
    const requestPromise = page.waitForRequest(req => req.url().includes('/move') && req.method() === 'PATCH');
    
    await card.dragTo(targetColumn);
    
    // Validar que la UI refleja el cambio (Optimistic UI)
    await expect(targetColumn.locator('.issue-card').first()).toBeVisible();
    
    // Validar la red (El PATCH debió devolver 200)
    const request = await requestPromise;
    const response = await request.response();
    expect(response?.status()).toBe(200);
  });
});
