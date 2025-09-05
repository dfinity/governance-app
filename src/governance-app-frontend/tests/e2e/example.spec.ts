import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });
  console.log('✅ Page loaded');

  await page.goto('http://127.0.0.1:3000/');
  console.log('✅ Page0', await page.title());
  await expect(page.getByTestId('main-layout')).toBeVisible();
  console.log('✅ Page1', await page.title());
  console.log(await page.innerHTML('body'));

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);

  await expect(page.getByTestId('login-test')).toHaveText(/Login with Internet Identity!/);

  console.log('✅ Page2');
  await login({ page });

  console.log('✅ Page3');
  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
  console.log('✅ Page4');
});
