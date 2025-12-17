import { expect, test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';
import { takeSnapshot } from './utils/take-snapshot';

test('Has title.', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  await openApp({ page });

  await expect(page).toHaveTitle('The Governance App');

  // Wait for map to load on desktop (md breakpoint is 768px)
  const viewportSize = page.viewportSize();
  if (viewportSize && viewportSize.width >= 768) {
    await page.waitForSelector('[data-testid="decentralized-map"]', { state: 'visible' });
    // Small delay to ensure fade-in animation starts/completes if needed, 
    // though ideally we'd disable animations in test mode.
    await page.waitForTimeout(1000);
  }

  await takeSnapshot({ page, label: 'login--signed-out' });

  await login({ page });
});
