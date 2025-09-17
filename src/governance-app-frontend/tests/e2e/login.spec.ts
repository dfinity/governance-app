import { expect, test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  await openApp({ page });

  await expect(page).toHaveTitle('The Governance App');

  await takeSnapshot({ page, label: 'login--signed-out' });

  await login({ page });
  await expect(page.getByTestId('login-test')).toHaveText(/^Hello world! You are:/);

  await takeSnapshot({ page, label: 'login--signed-in' });
});
