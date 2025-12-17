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

  // Hide the random map via CSS to ensure stable snapshots
  await page.addStyleTag({
    content: '[data-testid="decentralized-map"] { opacity: 0 !important; }',
  });

  await takeSnapshot({ page, label: 'login--signed-out' });

  await login({ page });
});
