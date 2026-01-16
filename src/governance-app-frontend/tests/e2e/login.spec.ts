import { test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('Has title.', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  await openApp({ page });

  // Wait for the login card to ensure content is loaded
  await page.waitForSelector('[data-testid="login-btn"]');

  await takeSnapshot({ page, label: 'login--signed-out' });

  await login({ page });
});
