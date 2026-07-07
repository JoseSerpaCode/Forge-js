const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

(async () => {
  console.log("Setting up DB...");
  const db = new Database(path.join(process.cwd(), 'forge.db'));
  
  // Find the 'main' workspace
  const ws = db.prepare('SELECT id FROM workspaces WHERE sys_tag = \'main\'').get();
  if (!ws) {
    console.error("Main workspace not found!");
    process.exit(1);
  }
  
  const adminId = db.prepare('SELECT id FROM users WHERE username = \'jose\'').get().id;
  
  // Insert a test issue to drag
  const issueId = 'demo-issue-' + crypto.randomUUID().substring(0, 8);
  db.prepare('INSERT OR IGNORE INTO issues (id, workspace_id, type, title, reporter_id, status, position) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    issueId, ws.id, 'task', 'Kanban Demo Issue', adminId, 'todo', 100000
  );
  
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  const artifactsDir = '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358';
  
  console.log("Logging in...");
  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'jose');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4321/');
  
  console.log("Taking Hub screenshot...");
  // Wait a bit for animations
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactsDir, 'hub_screenshot.png') });
  
  console.log("Navigating to Board...");
  await page.goto('http://localhost:4321/w/main/board');
  await page.waitForTimeout(1000);
  
  console.log("Taking Board Before screenshot...");
  await page.screenshot({ path: path.join(artifactsDir, 'board_before.png') });
  
  console.log("Performing Drag and Drop...");
  // Try to drag the issue from To Do to In Progress
  const source = page.locator(`.issue-card`).first();
  const target = page.locator(`.board-column[data-status="in_progress"] .column-content`);
  
  await source.dragTo(target);
  
  console.log("Taking Board After screenshot...");
  // Wait for fetch request and DOM update
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactsDir, 'board_after.png') });
  
  await browser.close();
  console.log("Done!");
})();
