import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });
  console.log('✅ Page loaded');

  await page.goto('http://localhost:3000/');
  console.log('✅ Page0', await page.title());

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);

  console.log('✅ Page1', await page.title());
  console.log(await page.innerHTML('body'));
  await expect(page.getByTestId('login-test')).toHaveText(/Login with Internet Identity!/);

  console.log('✅ Page2');
  await login({ page });

  console.log('✅ Page3');
  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
  console.log('✅ Page4');
});
