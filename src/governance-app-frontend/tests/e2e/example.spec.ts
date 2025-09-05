import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  await page.goto('http://localhost:3000/');

  console.log('✅ Page loaded');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);

  await expect(page.getByTestId('login-test')).toHaveText(/Login with Internet Identity!/);

  await login({ page });

  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
});
