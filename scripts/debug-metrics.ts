import { chromium } from 'playwright';
import Database from 'better-sqlite3';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all network requests
  page.on('response', async (response) => {
    if (response.url().includes('/api/w/')) {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`[RESPONSE] ${text}`);
      } catch (e) {
        console.log(`[RESPONSE] Could not read body`);
      }
    }
  });

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));

  // 1. Login
  await page.goto('http://localhost:4322/login');
  // Use the rotated password here since we just changed it! Wait, we used LocalDevPass123! in the rotation.
  await page.fill('input[name="username"]', 'jose');
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD || 'LocalDevPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  // Find a valid workspace and sprint
  const db = new Database('forge.db');
  const ws = db.prepare('SELECT id, sys_tag FROM workspaces LIMIT 1').get() as any;
  if (!ws) {
    console.log("No workspace found");
    process.exit(1);
  }
  
  // Make sure there is a sprint
  let sprint = db.prepare('SELECT id FROM sprints WHERE workspace_id = ? LIMIT 1').get(ws.id) as any;
  if (!sprint) {
    const sprintId = require('crypto').randomUUID();
    db.prepare("INSERT INTO sprints (id, workspace_id, name, status) VALUES (?, ?, 'Sprint 0', 'completed')").run(sprintId, ws.id);
    sprint = { id: sprintId };
  }

  // Go to metrics dashboard
  console.log(`Navigating to /w/${ws.sys_tag}/metrics`);
  await page.goto(`http://localhost:4322/w/${ws.sys_tag}/metrics`);
  await page.waitForLoadState('networkidle');

  console.log('\n--- Initial Load Complete ---');

  // Change dropdown
  console.log(`\nSelecting Sprint: ${sprint.id}`);
  await page.selectOption('#global-sprint-selector', sprint.id);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for animations or extra fetches

  console.log('\n--- Sprint Selected ---');

  await browser.close();
})();
