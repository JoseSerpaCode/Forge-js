import { test, expect } from '@playwright/test';
import db from '../../src/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

test('Kanban: Positional rebalancing resolves collisions in Backlog (sprint_id IS NULL)', async ({ request, page }) => {
  // 1. Iniciar sesión para obtener las cookies de sesión (CREAR USUARIO Y SESIÓN DIRECTAMENTE)
  db.prepare("INSERT OR IGNORE INTO users (id, username, password_hash, is_sysadmin) VALUES ('user-rebalance', 'rebalance_user', ?, 1)").run(bcrypt.hashSync((process.env.TEST_PASSWORD || 'LocalDevPass123!'), 10));

  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, 'user-rebalance', expiresAt);

  const cookieHeader = `forge_session=${sessionId}`;

  // 2. Crear un workspace dedicado para evitar colisiones con test-kanban-security
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, sys_tag, created_by) VALUES ('ws-rebalance', 'Rebalance WS', 'ws-rebalance', 'user-rebalance')").run();
  db.prepare("INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, ws_role) VALUES ('ws-rebalance', 'user-rebalance', 'owner')").run();
  db.prepare("DELETE FROM issues WHERE workspace_id = 'ws-rebalance'").run();
  
  const reporterId = 'user-rebalance';

  const issue1 = 'issue-pos-1';
  const issue2 = 'issue-pos-2';
  const issue3 = 'issue-pos-3';
  
  // Insert issue 1 and 2 extremely close to each other to exhaust precision
  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-rebalance', ?, 'Issue 1', 'task', 'todo', 100000.0000001, null)
  `).run(issue1, reporterId);

  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-rebalance', ?, 'Issue 2', 'task', 'todo', 100000.0000002, null)
  `).run(issue2, reporterId);

  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_id, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-rebalance', ?, 'Issue 3', 'task', 'todo', 300000, null)
  `).run(issue3, reporterId);

  // Intentar mover Issue 3 justo entre Issue 1 e Issue 2
  // Dado que la diferencia es menor a 1e-6, debería disparar rebalance
  const res = await request.patch(`/api/issues/${issue3}/move`, {
    headers: { 'Cookie': cookieHeader },
    data: {
      status: 'todo',
      position: 100000.00000015
    }
  });

  expect(res.status()).toBe(200);

  // 3. Verificar en base de datos si ocurrió el rebalanceo
  const issues = db.prepare(`SELECT id, position FROM issues WHERE workspace_id = 'ws-rebalance' ORDER BY position ASC`).all() as any[];
  
  // El rebalanceo debería haber asignado 100000, 200000 y 300000 limpios
  expect(issues.length).toBe(3);
  expect(issues[0].position).toBe(100000);
  expect(issues[1].position).toBe(200000); // El que acabamos de mover
  expect(issues[2].position).toBe(300000);
  
  // Específicamente, verificamos que issue3 quedó en el medio
  expect(issues[0].id).toBe(issue1);
  expect(issues[1].id).toBe(issue3);
  expect(issues[2].id).toBe(issue2);
});
