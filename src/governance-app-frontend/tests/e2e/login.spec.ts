import { expect, test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('Successfully logs in', async ({ page }) => {
  // Emulate reduced motion preference to hide video and show static image
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await openApp({ page, url: '/login' });
  await expect(page.getByTestId('login-btn')).toBeVisible();

  await takeSnapshot({ page, label: 'login--signed-out' });
  await login({ page });
});
