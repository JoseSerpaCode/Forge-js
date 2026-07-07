import db from '../src/lib/db.js';
import crypto from 'crypto';

async function runTest() {
  console.log("Setting up board filter test data...");
  const wsId = 'ws-test-board';
  const userId = crypto.randomUUID();
  
  db.prepare("DELETE FROM issues WHERE workspace_id = ?").run(wsId);
  db.prepare("DELETE FROM workspaces WHERE id = ?").run(wsId);
  db.prepare("DELETE FROM users WHERE username = ?").run('tester-board');

  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(userId, 'tester-board', 'hash');
  db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)").run(wsId, 'Board WS', 'TEST_BOARD', userId);
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)").run(wsId, userId, 'owner');
  
  const sessionId = crypto.randomUUID();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, userId, Date.now() + 100000);

  // Issue 1: Backlog (sprint_id = null)
  const issueBacklog = crypto.randomUUID();
  // Issue 2: Sprint 1 (sprint_id = 'sprint-1')
  const issueSprint = crypto.randomUUID();
  db.prepare('INSERT INTO sprints (id, workspace_id, name) VALUES (?, ?, ?)').run('sprint-1', wsId, 'Test Sprint');
  
  db.prepare(`INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) VALUES (?, ?, ?, 'BACKLOG_ISSUE_123', 'task', 'todo', 100000, null)`).run(issueBacklog, wsId, userId);
  db.prepare(`INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) VALUES (?, ?, ?, 'SPRINT_ISSUE_456', 'task', 'todo', 100000, 'sprint-1')`).run(issueSprint, wsId, userId);

  console.log("Fetching board HTML...");
  const res = await fetch(`http://localhost:4321/w/TEST_BOARD/board`, {
    headers: { 'Cookie': `forge_session=${sessionId}` }
  });
  
  const html = await res.text();
  
  const hasBacklog = html.includes('BACKLOG_ISSUE_123');
  const hasSprint = html.includes('SPRINT_ISSUE_456');
  
  console.log(`Includes Backlog Issue: ${hasBacklog}`);
  console.log(`Includes Sprint Issue: ${hasSprint}`);
  
  if (hasBacklog && !hasSprint) {
    console.log("TEST PASSED: Board only renders backlog issues.");
  } else {
    console.log("TEST FAILED: Board is bleeding sprint issues or missing backlog issues.");
  }
}

runTest().catch(console.error);
