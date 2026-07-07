import db from './src/lib/db.js';
import crypto from 'crypto';

async function runTest() {
  console.log("Setting up rebalance test data...");
  const wsId = 'ws-test-rebalance';
  const userId = crypto.randomUUID();
  
  // Clean up
  db.prepare("DELETE FROM issues WHERE workspace_id = ?").run(wsId);
  db.prepare("DELETE FROM workspaces WHERE id = ?").run(wsId);
  db.prepare("DELETE FROM users WHERE username = ?").run('tester-rebalance');

  // Set up auth data
  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(userId, 'tester-rebalance', 'hash');
  db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, ?, ?, ?)").run(wsId, 'Rebalance WS', 'ws-test-rebalance', userId);
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)").run(wsId, userId, 'owner');
  
  // Set up session
  const sessionId = crypto.randomUUID();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, userId, Date.now() + 100000);

  // Set up issues in backlog (sprint_id = null)
  const issue1 = crypto.randomUUID();
  const issue2 = crypto.randomUUID();
  const issue3 = crypto.randomUUID();
  
  db.prepare(`INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) VALUES (?, ?, ?, 'Iss 1', 'task', 'todo', 100000.00000000001, null)`).run(issue1, wsId, userId);
  db.prepare(`INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) VALUES (?, ?, ?, 'Iss 2', 'task', 'todo', 100000.00000000002, null)`).run(issue2, wsId, userId);
  db.prepare(`INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) VALUES (?, ?, ?, 'Iss 3', 'task', 'todo', 300000, null)`).run(issue3, wsId, userId);

  console.log("Data inserted. Attempting to move Issue 3 between 1 and 2...");
  const targetPos = 100000.000000000015;

  const res = await fetch(`http://localhost:4321/api/issues/${issue3}/move`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `forge_session=${sessionId}`
    },
    body: JSON.stringify({ status: 'todo', position: targetPos, sprint_id: null })
  });
  
  console.log(`Response: ${res.status}`);
  const text = await res.text();
  console.log(`Body: ${text}`);

  if (res.status === 200) {
    const issues = db.prepare(`SELECT id, position FROM issues WHERE workspace_id = ? ORDER BY position ASC`).all(wsId);
    console.log("Resulting positions:");
    console.dir(issues);
    
    if (issues[0].position === 100000 && issues[1].position === 200000 && issues[2].position === 300000) {
      console.log("REBALANCE SUCCESSFUL!");
    } else {
      console.log("REBALANCE FAILED OR INCORRECT!");
    }
  }
}

runTest().catch(console.error);
