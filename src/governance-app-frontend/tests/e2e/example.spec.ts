import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test.skip('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });
  console.log('✅ Page loaded');

  page.on('request', (req) => {
    console.log('🚀HEADERS:');
    console.log(req.method());
    console.log(req.headers());
    console.log(req.url());
  });

  // await page.goto('http://localhost:3000/');
  await page.goto('http://lqy7q-dh777-77777-aaaaq-cai.localhost:8080');
  console.log('✅ Page0', await page.title());
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });
  console.log('✅ Page1', await page.title());
  console.log(await page.innerHTML('body'));

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);

  await expect(page).toHaveScreenshot('home-signed-out', { fullPage: true });

  await expect(page.getByTestId('login-test')).toHaveText(/Login with Internet Identity!/);

  console.log('✅ Page2');
  await login({ page });

  console.log('✅ Page3');
  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
  console.log('✅ Page4');

  await expect(page).toHaveScreenshot('home-signed-out', { fullPage: true });
});
