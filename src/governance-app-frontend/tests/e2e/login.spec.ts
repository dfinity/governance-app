import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  // const url = 'http://localhost:3000/';
  // const url = 'http://lqy7q-dh777-77777-aaaaq-cai.localhost:8080';
  await page.goto('/');

  await page.waitForLoadState('networkidle'); // ensures all assets loaded
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveTitle('The Governance App');

  // await takeSnapshot({ page, label: 'home-signed-out' });

  await login({ page });
  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);

  // await takeSnapshot({ page, label: 'home-signed-in' });
});
