import { test, expect } from '@playwright/test';

test.describe('Metrics API Security', () => {
  let outsiderContext;
  let outsiderPage;
  
  test.beforeAll(async ({ browser }) => {
    // Create an outsider user
    outsiderContext = await browser.newContext();
    outsiderPage = await outsiderContext.newPage();
    
    // Register the outsider
    await outsiderPage.goto('/login');
    await outsiderPage.fill('input[name="username"]', 'outsider_metrics');
    await outsiderPage.fill('input[name="password"]', 'outsider123');
    await outsiderPage.click('button[type="submit"]');
    await outsiderPage.waitForURL('**/');
  });

  test.afterAll(async () => {
    await outsiderContext.close();
  });

  test('Outsider receives 403 or 404 when trying to access metrics of SYS workspace', async () => {
    // The outsider is NOT a member of 'SYS'
    
    // Test Distribution
    const distResponse = await outsiderPage.request.get('/api/w/SYS/metrics/distribution');
    const distStatus = distResponse.status();
    expect(distStatus === 404 || distStatus === 403).toBeTruthy();

    // Test Burndown
    const burnResponse = await outsiderPage.request.get('/api/w/SYS/metrics/burndown?sprint_id=some_id');
    const burnStatus = burnResponse.status();
    expect(burnStatus === 404 || burnStatus === 403).toBeTruthy();
    
    // Test Velocity
    const velResponse = await outsiderPage.request.get('/api/w/SYS/metrics/velocity');
    const velStatus = velResponse.status();
    expect(velStatus === 404 || velStatus === 403).toBeTruthy();
    
    // Test Precision
    const precResponse = await outsiderPage.request.get('/api/w/SYS/metrics/precision');
    const precStatus = precResponse.status();
    expect(precStatus === 404 || precStatus === 403).toBeTruthy();
  });
});
