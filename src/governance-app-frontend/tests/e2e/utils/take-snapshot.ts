import test, { expect, Page } from '@playwright/test';

export const takeSnapshot = async ({ page, label }: { page: Page; label: string }) => {
  await test.step(`Take Snapshot (${label})`, async () => {
    const masks = page.locator('[data-snapshot-mask]');

    // iPhone 16 pro viewport
    await page.setViewportSize({ width: 402, height: 874 });
    await expect(page).toHaveScreenshot(`${label}-402x874.png`, {
      fullPage: true,
      mask: [masks],
    });

    // MacBook Air 13.3 viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot(`${label}-1440x900.png`, {
      fullPage: true,
      mask: [masks],
    });
  });
};
