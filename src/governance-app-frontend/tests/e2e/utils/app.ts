import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub external services with test data for consistent behavior.
  await stubIcpSwap(page);
  await stubKongSwap(page);

  // Set e2e flag to disable TanStack Query retries.
  await page.addInitScript(() => {
    window.isPlaywright = true;
  });

  // Navigate to the page
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Page navigated, checking title...');
  const title = await page.title();
  console.log('Page title:', title);

  // Give the app time to start rendering
  console.log('Waiting 10s for app to initialize...');
  await page.waitForTimeout(10000);

  console.log('Checking for app content...');
  const rootText = await page.locator('#root').textContent();
  console.log('#root text length:', rootText?.length || 0);
  if (rootText && rootText.length > 0) {
    console.log('#root preview:', rootText.substring(0, 200));
  }

  console.log('Waiting for main content to be visible...');
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 60000,
  });
  console.log('✅ App loaded successfully!');
};
