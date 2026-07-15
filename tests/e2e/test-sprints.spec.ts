import { test, expect } from '@playwright/test';
import db from '../../src/lib/db.js';
import crypto from 'crypto';

test.describe('Sprint Organizer & Isolation', () => {
  let ws1Id: string;
  let ws2Id: string;
  let sprintWs2Id: string;
  let sysTagWs1: string;

  test.beforeAll(() => {
    ws1Id = crypto.randomUUID();
    ws2Id = crypto.randomUUID();
    sprintWs2Id = crypto.randomUUID();
    sysTagWs1 = 'e2e_ws1_' + crypto.randomUUID().substring(0,8);
    const ws2SysTag = 'e2e_ws2_' + crypto.randomUUID().substring(0,8);
    
    const adminId = db.prepare('SELECT id FROM users WHERE username = ?').get('jose') as any;

    db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, 'WS1', ?, ?)").run(ws1Id, sysTagWs1, adminId.id);
    db.prepare("INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, 'owner')").run(ws1Id, adminId.id);

    db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, 'WS2', ?, ?)").run(ws2Id, ws2SysTag, adminId.id);
    db.prepare("INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, 'owner')").run(ws2Id, adminId.id);
    db.prepare("INSERT INTO sprints (id, workspace_id, name, start_date) VALUES (?, ?, 'Sprint WS2', NULL)").run(sprintWs2Id, ws2Id);
    
    // Create an issue in WS1 backlog
    db.prepare("INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position) VALUES (?, ?, ?, 'Test Issue', 'task', 'todo', 100000)").run(crypto.randomUUID(), ws1Id, adminId.id);
  });

  test.afterAll(() => {
    db.prepare("DELETE FROM sprints WHERE id = ?").run(sprintWs2Id);
    db.prepare("DELETE FROM issues WHERE workspace_id = ?").run(ws1Id);
    db.prepare("DELETE FROM workspaces WHERE id IN (?, ?)").run(ws1Id, ws2Id);
  });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('IDOR Isolation: Cross-workspace sprint ID via URL is rejected (returns 404)', async ({ page }) => {
    const res = await page.goto(`/w/${sysTagWs1}/board?sprint=${sprintWs2Id}`);
    expect(res?.status()).toBe(404);
    
    const text = await page.content();
    expect(text).toContain('Sprint Not Found');
  });

  test('Functional: Create Sprint, Move Issue to Sprint, and Filter Board', async ({ page }) => {
    await page.goto(`/w/${sysTagWs1}/board`);
    
    // 1. Check Backlog is selected by default
    const selector = page.locator('#sprint-selector');
    await expect(selector).toHaveValue('backlog');

    // 2. Create Sprint
    await page.click('#btn-new-sprint');
    await expect(page.locator('#new-sprint-modal')).toBeVisible();
    
    const sprintName = `E2E Sprint ${crypto.randomUUID().substring(0, 4)}`;
    await page.fill('#sprint-name', sprintName);
    
    // Catch API responses explicitly in test
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/sprints') && res.request().method() === 'POST'),
      page.click('#btn-save-sprint')
    ]);


    // 3. Page reloads and auto-selects the new sprint
    await expect(page).toHaveURL(new RegExp(`\\?sprint=`));
    
    // Switch back to backlog to find an issue
    await page.selectOption('#sprint-selector', 'backlog');
    await expect(page).not.toHaveURL(new RegExp(`\\?sprint=`));

    // 4. Open an issue and move it to the new sprint
    const issueCards = page.locator('.issue-card');
    await expect(issueCards.first()).toBeVisible();
    const firstIssueId = await issueCards.first().getAttribute('id');
    
    // Open modal
    await issueCards.first().click();
    await expect(page.locator('#issue-details-modal')).toBeVisible();
    
    // Select the new sprint in the modal
    await page.locator('#modal-issue-sprint').selectOption({ label: sprintName });
    
    // 5. The page reloads automatically when sprint changes
    await page.waitForLoadState('networkidle');
    
    // Wait for the board to finish rendering after reload
    await page.waitForSelector('.kanban-container');

    // The issue should now be GONE from the backlog
    const checkIssueInBacklog = page.locator(`.issue-card[id="${firstIssueId}"]`);
    await expect(checkIssueInBacklog).toHaveCount(0);

    // 6. Change board filter to the new sprint
    await page.selectOption('#sprint-selector', { label: sprintName });
    await page.waitForSelector('.kanban-container');
    
    // 7. Verify the issue is now visible in the sprint board
    const checkIssueInSprint = page.locator(`.issue-card[id="${firstIssueId}"]`);
    await expect(checkIssueInSprint).toHaveCount(1);
  });
});
