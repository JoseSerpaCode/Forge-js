import { test, expect } from '@playwright/test';
import { getTestDb } from './test-utils';

test.describe('Kanban Security & Move Endpoint', () => {

  test('Caso A: IDOR - Mover issue de un workspace donde el usuario no es miembro retorna 404', async ({ page }) => {
    // 1. Iniciar sesión como test-user-notion-a (no es miembro de ws-jose-test)
    await page.goto('/login');
    await page.fill('input[name="username"]', 'TestUserNotionA');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    const response = await page.request.patch('/api/issues/test-kanban-issue-1/move', {
      data: {
        status: 'in_progress',
        position: 150000
      }
    });
    
    console.log(`Caso A status code: ${response.status()}`);
    expect(response.status()).toBe(404);
  });

  test('Caso B: Privilege Escalation - Miembro con rol insuficiente (viewer) recibe 403', async ({ page }) => {
    // 1. Preparar fixture: Agregar a test-user-notion-b como "viewer" a ws-jose-test
    const db = getTestDb();
    db.prepare(`INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)`).run('ws-jose-test', 'test-user-notion-b', 'viewer');

    // 2. Iniciar sesión como test-user-notion-b
    await page.goto('/login');
    await page.fill('input[name="username"]', 'TestUserNotionB');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    const response = await page.request.patch('/api/issues/test-kanban-issue-1/move', {
      data: {
        status: 'in_progress',
        position: 150000
      }
    });
    
    console.log(`Caso B status code: ${response.status()}`);
    expect(response.status()).toBe(403);
  });

  test('Caso C: Asignar sprint_id que pertenece a OTRO workspace retorna 400', async ({ page }) => {
    // 1. Crear un sprint en ws-notion-a (otro workspace)
    const db = getTestDb();
    db.prepare(`INSERT OR IGNORE INTO sprints (id, workspace_id, name, status) VALUES (?, ?, ?, ?)`).run('sprint-notion-a-1', 'ws-notion-a', 'Sprint Secreto', 'active');

    // 2. Iniciar sesión como jose (owner de ws-jose-test)
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    const response = await page.request.patch('/api/issues/test-kanban-issue-1/move', {
      data: {
        status: 'in_progress',
        position: 150000,
        sprint_id: 'sprint-notion-a-1'
      }
    });
    
    console.log(`Caso C status code: ${response.status()}`);
    expect(response.status()).toBe(400);
  });

  test('Caso D: Asignar sprint_id que NO existe en absoluto retorna 400', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    const response = await page.request.patch('/api/issues/test-kanban-issue-1/move', {
      data: {
        status: 'in_progress',
        position: 150000,
        sprint_id: 'sprint-no-existe-12345'
      }
    });
    
    console.log(`Caso D status code: ${response.status()}`);
    expect(response.status()).toBe(400);
  });
});
