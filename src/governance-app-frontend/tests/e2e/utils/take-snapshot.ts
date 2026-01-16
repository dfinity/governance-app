import test, { expect, Page, PageAssertionsToHaveScreenshotOptions } from '@playwright/test';

export const takeSnapshot = async ({ page, label }: { page: Page; label: string }) => {
  await test.step(`Take Snapshot for ${label}.`, async () => {
    if (process.env.IGNORE_SCREENSHOTS) {
      console.log(`Skipping screenshot for ${label}.`);
      return;
    }

    const masks = page.locator('[data-snapshot-mask]');
    const options: PageAssertionsToHaveScreenshotOptions = {
      fullPage: true,
      mask: [masks],
      // Change mask (diff) color.
      maskColor: '#000',
    };

    // iPhone 16 pro viewport.
    await page.setViewportSize({ width: 402, height: 874 });
    await expect(page).toHaveScreenshot(`${label}-402x874.png`, options);

    // MacBook Air 13.3 viewport.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot(`${label}-1440x900.png`, options);
  });
};
