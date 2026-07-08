import { test, expect } from '@playwright/test';
import db from '../../src/lib/db';
import crypto from 'crypto';

test('Kanban: Positional rebalancing resolves collisions in Backlog (sprint_id IS NULL)', async ({ request, page }) => {
  // 1. Iniciar sesión para obtener las cookies de sesión
  await page.goto('/login');
  await page.fill('input[name="username"]', 'TestUserA');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');

  // Obtener headers de la página autenticada para inyectarlos en page.request
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // 2. Limpiar issues existentes en ws-a y crear dos issues en backlog (sprint_id = null)
  db.prepare("DELETE FROM issues WHERE workspace_id = 'ws-a'").run();
  
  const issue1 = crypto.randomUUID();
  const issue2 = crypto.randomUUID();
  const issue3 = crypto.randomUUID(); // Issue to be moved to cause collision
  
  // Insert issue 1 and 2 extremely close to each other to exhaust precision
  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_username, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-a', 'TestUserA', 'Issue 1', 'task', 'todo', 100000.00000000001, null)
  `).run(issue1);

  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_username, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-a', 'TestUserA', 'Issue 2', 'task', 'todo', 100000.00000000002, null)
  `).run(issue2);

  db.prepare(`
    INSERT INTO issues (id, workspace_id, reporter_username, title, type, status, position, sprint_id) 
    VALUES (?, 'ws-a', 'TestUserA', 'Issue 3', 'task', 'todo', 300000, null)
  `).run(issue3);

  // Intentar mover Issue 3 justo entre Issue 1 e Issue 2
  // Dado que la diferencia es 1e-17 (menor a 1e-10), debería disparar rebalance
  const targetPosition = 100000.000000000015;

  const res = await request.patch(`/api/issues/${issue3}/move`, {
    headers: { 'Cookie': cookieHeader },
    data: {
      status: 'todo',
      position: targetPosition
    }
  });

  expect(res.status()).toBe(200);

  // 3. Verificar en base de datos si ocurrió el rebalanceo
  const issues = db.prepare(`SELECT id, position FROM issues WHERE workspace_id = 'ws-a' ORDER BY position ASC`).all() as any[];
  
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
