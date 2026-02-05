import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // TEMPORARILY DISABLED for debugging - test if bare navigation works
  // await stubIcpSwap(page);
  // await stubKongSwap(page);
  // await page.addInitScript(() => { window.isPlaywright = true; });

  // Navigate to the page - simple, no extras
  console.log('Navigating to:', url);
  const response = await page.goto(url, { timeout: 60000 });
  console.log('Navigation response status:', response?.status());
  
  // Wait for page to fully load
  console.log('Waiting for page load...');
  await page.waitForLoadState('load', { timeout: 60000 });
  
  console.log('Page title:', await page.title());
  
  // Wait for React content
  console.log('Waiting for React to render...');
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 90000,
  });
  console.log('✅ App loaded successfully!');
};
