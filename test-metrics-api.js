import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('forge.db');
const testUser = 'metrics_tester';

// Insert user if not exists
const uid = crypto.randomUUID();
db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, 'hash') ON CONFLICT DO NOTHING").run(uid, testUser);
const user = db.prepare("SELECT id FROM users WHERE username = ?").get(testUser);

// Ensure metrics-ws exists and user is a member
const ws = db.prepare("SELECT id FROM workspaces WHERE sys_tag = 'metrics-ws'").get();
if (ws) {
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, 'editor') ON CONFLICT DO NOTHING").run(ws.id, user.id);
}

// Get sprint
const sprint = db.prepare("SELECT id FROM sprints WHERE workspace_id = ?").get(ws.id);

// Create session
const sessionId = crypto.randomUUID();
db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, user.id, Date.now() + 3600000);
const cookieHeader = `forge_session=${sessionId}`;

async function run() {
  console.log('--- Distribution ---');
  const distRes = await fetch('http://localhost:5432/api/w/metrics-ws/metrics/distribution', {
    headers: { 'Cookie': cookieHeader }
  });
  console.log(JSON.stringify(await distRes.json(), null, 2));

  console.log('\n--- Burndown ---');
  const burnRes = await fetch(`http://localhost:5432/api/w/metrics-ws/metrics/burndown?sprint_id=${sprint.id}`, {
    headers: { 'Cookie': cookieHeader }
  });
  console.log(JSON.stringify(await burnRes.json(), null, 2));

  console.log('\n--- Velocity ---');
  const velRes = await fetch('http://localhost:5432/api/w/metrics-ws/metrics/velocity', {
    headers: { 'Cookie': cookieHeader }
  });
  console.log(JSON.stringify(await velRes.json(), null, 2));
  
  console.log('\n--- Precision ---');
  const precRes = await fetch('http://localhost:5432/api/w/metrics-ws/metrics/precision', {
    headers: { 'Cookie': cookieHeader }
  });
  console.log(JSON.stringify(await precRes.json(), null, 2));
  
  console.log('\n--- SECURITY TEST (Unauthorized User) ---');
  // Create an unauthorized session
  const outsiderId = crypto.randomUUID();
  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, 'hash') ON CONFLICT DO NOTHING").run(outsiderId, `outsider_${Date.now()}`);
  const outsiderSessionId = crypto.randomUUID();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(outsiderSessionId, outsiderId, Date.now() + 3600000);
  const outsiderCookie = `forge_session=${outsiderSessionId}`;
  
  const distRes403 = await fetch('http://localhost:5432/api/w/metrics-ws/metrics/distribution', { headers: { 'Cookie': outsiderCookie } });
  console.log('Distribution as outsider:', distRes403.status);
  
  const burnRes403 = await fetch(`http://localhost:5432/api/w/metrics-ws/metrics/burndown?sprint_id=${sprint.id}`, { headers: { 'Cookie': outsiderCookie } });
  console.log('Burndown as outsider:', burnRes403.status);
  
  const velRes403 = await fetch('http://localhost:5432/api/w/metrics-ws/metrics/velocity', { headers: { 'Cookie': outsiderCookie } });
  console.log('Velocity as outsider:', velRes403.status);
  
  const precRes403 = await fetch(`http://localhost:5432/api/w/metrics-ws/metrics/precision?sprint_id=${sprint.id}`, { headers: { 'Cookie': outsiderCookie } });
  console.log('Precision as outsider:', precRes403.status);

  console.log('\n--- CROSS-WORKSPACE SPRINT IDOR TEST ---');
  // Create Workspace B and Sprint B
  const wsBId = crypto.randomUUID();
  db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, 'WS B', 'ws-b', 'sysadmin') ON CONFLICT DO NOTHING").run(wsBId);
  const sprintBId = crypto.randomUUID();
  db.prepare("INSERT INTO sprints (id, workspace_id, name, status, start_date, end_date) VALUES (?, ?, 'Sprint B', 'active', ?, ?)").run(sprintBId, wsBId, new Date().toISOString(), new Date().toISOString());
  
  // Try to access Sprint B from metrics-ws
  const idorRes = await fetch(`http://localhost:5432/api/w/metrics-ws/metrics/burndown?sprint_id=${sprintBId}`, { headers: { 'Cookie': cookieHeader } });
  const idorJson = await idorRes.json();
  console.log('Burndown Cross-Workspace Sprint Status:', idorRes.status);
  console.log('Burndown Cross-Workspace Sprint Error:', idorJson.error);
}

run();
