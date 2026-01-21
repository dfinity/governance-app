import { test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('Successfully logs in', async ({ page }) => {
  await openApp({ page });
  await page.getByTestId('login-btn');

  // Hide the video background via CSS to ensure stable snapshots
  await page.addStyleTag({
    content: '[data-testid="video-background"] { opacity: 0 !important; }',
  });

  await takeSnapshot({ page, label: 'login--signed-out' });
  await login({ page });
});
