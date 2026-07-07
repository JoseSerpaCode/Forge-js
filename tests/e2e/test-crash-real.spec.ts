import { test, expect } from '@playwright/test';

test('Reproduce real crash', async ({ page }) => {
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { 
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); 
  });

  await page.goto('http://localhost:4321/login');
  await page.fill('input[name="username"]', 'Jose');
  await page.fill('input[name="password"]', '#juniorManda1924');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4321/', { timeout: 10000 });
  
  await page.goto('http://localhost:4321/settings');
  await page.fill('#username-input', 'Jose2');
  await page.click('#btn-save-settings');
  
  // Wait for the reload
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.waitForLoadState('networkidle');

  // Prueba de vida: click en cualquier link del Sidebar y verifica que reacciona
  const sidebarLink = page.locator('nav a').first();
  await sidebarLink.click();
  await page.waitForTimeout(500);

  // Si el bug es real, esto debería fallar o quedarse igual sin cambiar de estado
  const isActive = await sidebarLink.evaluate(el => el.classList.contains('active') || el.classList.contains('text-forge-neon'));
  console.log('¿El link respondió al click después del reload de perfil?:', isActive);

  // También verifica si quedaron listeners duplicados o si el script de settings sigue "vivo" en esta vista
  const listenerCount = await page.evaluate(() => {
    return document.getElementById('btn-save-settings') ? 'settings script sigue presente en esta vista' : 'ok, no está presente';
  });
  console.log('Estado del script de settings tras navegar:', listenerCount);
});
