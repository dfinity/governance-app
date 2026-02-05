import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // TEMPORARILY DISABLED: Stub external services - testing if these cause container issues
  // await stubIcpSwap(page);
  // await stubKongSwap(page);

  // Set e2e flag to disable TanStack Query retries.
  await page.addInitScript(() => {
    window.isPlaywright = true;
  });

  // Navigate and wait for basic page load
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Check if page actually loaded
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log('Body has content:', bodyText ? bodyText.length : 0, 'chars');
  console.log('Body preview:', bodyText?.substring(0, 300));
  
  // Check if #root has content
  const rootContent = await page.locator('#root').textContent();
  console.log('#root has content:', rootContent ? rootContent.length : 0, 'chars');

  // Wait directly for the main app content (React will hydrate when ready)
  // Using a very generous timeout for container environments
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 90000,
  });
};
