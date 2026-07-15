import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import crypto from 'crypto';

(async () => {
  const db = new Database('forge.db');
  const jose = db.prepare("SELECT id FROM users WHERE username = 'jose'").get() as any;
  const userId = jose.id;
  const wsId = crypto.randomUUID();
  const issueId = crypto.randomUUID();
  const sysTag = `timer-test-${crypto.randomUUID().substring(0,8)}`;

  // Setup WS and Issue
  db.prepare('INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)').run(wsId, 'Timer Testing', sysTag, userId);
  db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(wsId, userId, 'owner');
  db.prepare('INSERT INTO issues (id, workspace_id, type, title, status, position, reporter_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(issueId, wsId, 'task', 'Prueba Visual del Timer', 'todo', 100000, userId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'jose');
  await page.fill('input[name="password"]', (process.env.TEST_PASSWORD || 'LocalDevPass123!'));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  // Go to board
  await page.goto(`http://localhost:4321/w/${sysTag}/board`);
  await page.waitForLoadState('networkidle');

  // Take screenshot of initial state
  await page.screenshot({ path: '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358/timer-before.png' });

  // Click Start
  await page.locator(`.issue-card[id="${issueId}"] .btn-start-timer`).click();
  await page.waitForLoadState('networkidle');

  // Take screenshot of active timer
  await page.screenshot({ path: '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358/timer-active.png' });

  // Fast forward time
  db.prepare("UPDATE time_tracking_sessions SET started_at = datetime('now', '-2 hours') WHERE issue_id = ?").run(issueId);
  
  // Reload to reflect time
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358/timer-running.png' });

  // Move to Done via API
  await page.request.patch(`http://localhost:4321/api/issues/${issueId}/move`, {
    data: { status: 'done', position: 200000, workspaceId: wsId }
  });

  // Reload to see auto-stopped state
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of done state
  await page.screenshot({ path: '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358/timer-done.png' });

  await browser.close();
  console.log('Screenshots captured!');
})();
