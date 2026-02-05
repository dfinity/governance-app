import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Set e2e flag to disable TanStack Query retries BEFORE navigation
  await page.addInitScript(() => {
    window.isPlaywright = true;
  });

  // Stub external services with test data BEFORE navigation
  await stubIcpSwap(page);
  await stubKongSwap(page);

  console.log('Navigating to:', url);
  // Navigate and wait for page load
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  console.log('Waiting for app to render...');
  // Wait directly for the main app content (React will hydrate when ready)
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 60000,
  });
  
  console.log('✅ App loaded successfully');
};
