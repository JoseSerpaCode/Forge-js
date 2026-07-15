import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('forge.db');

// Create indexes
db.prepare('CREATE INDEX IF NOT EXISTS idx_issues_metrics ON issues(workspace_id, sprint_id, status)').run();

const workspaceId = crypto.randomUUID();
db.prepare("INSERT INTO users (id, username, password_hash) VALUES ('sysadmin', 'admin', 'hash') ON CONFLICT DO NOTHING").run();
db.prepare("INSERT INTO workspaces (id, name, sys_tag, created_by) VALUES (?, 'Metrics WS', 'metrics-ws', 'sysadmin')").run(workspaceId);

const users = [];
for (let i = 0; i < 5; i++) {
  const uid = crypto.randomUUID();
  users.push(uid);
  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, 'hash')").run(uid, `user-${i}`);
}

const sprints = [];
for (let i = 0; i < 10; i++) {
  const sid = crypto.randomUUID();
  sprints.push(sid);
  db.prepare("INSERT INTO sprints (id, workspace_id, name, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)").run(
    sid, workspaceId, `Sprint ${i}`, i < 5 ? 'completed' : 'active', new Date().toISOString(), new Date().toISOString()
  );
}

const stmt = db.prepare(`
  INSERT INTO issues (id, workspace_id, sprint_id, title, type, status, reporter_id, assignee_id, estimated_hours, logged_hours)
  VALUES (?, ?, ?, ?, 'task', ?, 'sysadmin', ?, ?, ?)
`);

db.transaction(() => {
  for (let i = 0; i < 5000; i++) {
    const status = Math.random() > 0.5 ? 'done' : 'todo';
    const assignee = Math.random() > 0.2 ? users[Math.floor(Math.random() * users.length)] : null;
    const sprint = Math.random() > 0.2 ? sprints[Math.floor(Math.random() * sprints.length)] : null;
    stmt.run(
      crypto.randomUUID(), workspaceId, sprint, `Issue ${i}`, status, assignee,
      Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)
    );
  }
})();

console.log('Seeded 5000 issues');
console.log('Workspace ID:', workspaceId);
