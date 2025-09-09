import { test, expect } from '@playwright/test';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });
  console.log('✅ Page loaded');

  // page.on('request', (req) => {
  //   console.log('🚀HEADERS:');
  //   console.log(req.method());
  //   console.log(req.headers());
  //   console.log(req.url());
  // });

  // TODO: get the url from env?
  // await page.goto('http://localhost:3000/');
  await page.goto('http://lqy7q-dh777-77777-aaaaq-cai.localhost:8080');
  console.log('✅ Page0', await page.title());

  await page.waitForLoadState('networkidle'); // ensures all assets loaded
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });

  console.log('✅ Page1', await page.title());

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);
  // await takeSnapshot({ page, label: 'home-signed-out' });

  console.log('✅ Page2');
  await login({ page });

  console.log('✅ Page3');
  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
  console.log('✅ Page4');

  // await takeSnapshot({ page, label: 'home-signed-in' });
});
