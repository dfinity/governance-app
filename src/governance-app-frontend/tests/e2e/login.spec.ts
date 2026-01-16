import { test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('Successfully logs in', async ({ page }) => {
  await openApp({ page });
  await page.waitForSelector('[data-testid="login-btn"]');
  await takeSnapshot({ page, label: 'login--signed-out' });
  await login({ page });
});
