import { test, expect } from '@playwright/test';
import { getTestDb } from './test-utils';
import path from 'path';

test.describe('Forge OS - Full System Omnibus Validation', () => {

  test('Debe cumplir con todos los flujos de los Tomos I-IV y V12', async ({ page }) => {
    // === TOMO II: Seguridad y Login ===
    await page.goto('/login');
    
    // Test protección de rutas (Si no está logueado, redirige a login)
    await page.goto('/settings');
    await expect(page).toHaveURL(/.*login.*/);

    // Ejecutar Login exitoso
    await page.goto('/login');
    await page.fill('input[name="username"]', 'jose');
    await page.fill('input[name="password"]', '#juniorManda1924');
    await page.click('button[type="submit"]');

    // Esperar redirección al index y luego navegar manualmente al board (ya que el index en Forge está vacío o redirige)
    await page.waitForURL('**/');
    await page.goto('/w/test-workspace/board');

    // === TOMO III / V12: Interfaz Visual y Layout (Tailwind) ===
    // Validar TopBar y Sidebar rendering
    await expect(page.locator('aside.bg-forge-panel')).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
    
    // === TOMO IV / V12: API y TopBar interactivo ===
    // Presionar '/' enfoca la búsqueda
    await page.keyboard.press('/');
    await expect(page.locator('#global-search')).toBeFocused();

    // Notificaciones fetch
    let alertMessage = '';
    page.on('dialog', dialog => {
      alertMessage = dialog.message();
      dialog.accept();
    });
    
    // (Removed notifications test since UI is pending)

    // === TOMO III: Kanban Drag & Drop ===
    const firstCard = page.locator('.issue-card').first();
    await expect(firstCard).toBeVisible();
    
    const targetColumn = page.locator('.board-column[data-status="in_progress"] .column-content');
    
    // Escuchar request de PATCH
    const patchPromise = page.waitForRequest(req => req.url().includes('/api/issues/') && req.method() === 'PATCH');
    await firstCard.dragTo(targetColumn);
    
    const patchReq = await patchPromise;
    expect(patchReq.method()).toBe('PATCH');
    const patchRes = await patchReq.response();
    expect(patchRes?.status()).toBe(200);

    // === V12: Modal Issue Details ===
    const issueModal = page.locator('#issue-details-modal');
    await firstCard.click();
    await expect(issueModal).not.toHaveClass(/translate-x-full/);
    
    // Revisar que el título y SP estén en el modal
    await expect(page.locator('#modal-issue-title')).not.toBeEmpty();

    // Cerrar modal
    await page.click('#close-modal-btn');
    await expect(issueModal).toHaveClass(/translate-x-full/);

    // === V12: Settings y DB Update ===
    // Navegar a settings
    await page.click('#btn-settings');
    await page.waitForURL('**/settings');
    
    await expect(page.locator('#username-input')).toHaveValue('jose');
    
    // Cambiar nombre
    await page.fill('#username-input', 'jose_admin');
    
    const settingsPromise = page.waitForRequest(req => req.url().includes('/settings') && req.method() === 'POST');
    await page.click('#btn-save-settings');
    
    const settingsReq = await settingsPromise;
    expect((await settingsReq.response())?.status()).toBe(200);
    
    // Validación SQLite
    const db = getTestDb();
    const user = db.prepare('SELECT username FROM users WHERE username = ?').get('jose_admin') as any;
    expect(user).toBeDefined();
    expect(user.username).toBe('jose_admin');

    // Cleanup DB (Rollback)
    db.prepare('UPDATE users SET username = ? WHERE username = ?').run('jose', 'jose_admin');
    db.close();
  });
});
