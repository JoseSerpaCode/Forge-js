import { chromium } from 'playwright';
import Database from 'better-sqlite3';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all network requests
  page.on('response', async (response) => {
    if (response.url().includes('/api/issues/')) {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`[RESPONSE] ${text.substring(0, 200)}`);
      } catch (e) {
        console.log(`[RESPONSE] Could not read body`);
      }
    }
  });

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));

  // 1. Login
  await page.goto('http://localhost:4322/login');
  await page.fill('input[name="username"]', 'jose');
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD || 'LocalDevPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  // Find a valid workspace and sprint
  const db = new Database('forge.db');
  const ws = db.prepare('SELECT id, sys_tag FROM workspaces LIMIT 1').get() as any;
  const issue = db.prepare('SELECT id FROM issues WHERE workspace_id = ? LIMIT 1').get(ws.id) as any;
  
  if (!issue) {
    console.log("No issue found");
    process.exit(1);
  }

  // Go to metrics dashboard
  console.log(`Navigating to /w/${ws.sys_tag}`);
  await page.goto(`http://localhost:4322/w/${ws.sys_tag}`);
  await page.waitForLoadState('networkidle');

  console.log('\n--- Clicking Issue Card ---');
  await page.click(`.issue-card[id="${issue.id}"]`);
  
  await page.waitForTimeout(2000);

  await browser.close();
})();
