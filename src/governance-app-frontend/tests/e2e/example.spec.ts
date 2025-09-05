import { test, expect } from '@playwright/test';
import { login } from './utils/login';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Governance App/);

  await login({ page });

  await expect(page.getByTestId('login-test')).toHaveText(/Hello world! You are: /);
});
