import { expect, type Page } from '@playwright/test';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle'); // ensures all assets loaded
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });
};
