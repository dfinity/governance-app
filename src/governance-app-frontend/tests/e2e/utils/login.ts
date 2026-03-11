import { expect, type Page, test } from '@playwright/test';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeEnabled();

    const [newTab] = await Promise.all([
      // Catches the new tab.
      page.waitForEvent('popup'),
      page.getByTestId('login-btn').click(),
    ]);

    // Ensures all assets loaded.
    await newTab.waitForLoadState('networkidle');
    await expect(newTab).toHaveTitle(/Internet Identity/);

    // Create new identity.
    await newTab.getByRole('button', { name: 'Continue with passkey' }).click();
    await newTab.getByRole('button', { name: 'Create new identity' }).click();
    await newTab.getByPlaceholder('Identity name').fill('E2E Test');
    await newTab.getByRole('button', { name: 'Create identity' }).click();

    const continueBtn = newTab.getByRole('button', { name: 'continue' }).first();
    await continueBtn.waitFor({ state: 'visible', timeout: 30000 });
    await continueBtn.click();

    // Wait until user is redirected back and tab closes.
    await newTab.waitForEvent('close');
    expect(newTab.isClosed()).toBe(true);

    // Close the welcome modal if it appears.
    // The Continue button may be delayed while advanced feature detection runs.
    const welcomeModal = page.getByTestId('welcome-modal');
    try {
      await welcomeModal.waitFor({ state: 'visible', timeout: 30000 });
      const ctaBtn = page.getByTestId('welcome-modal-cta-btn');
      await ctaBtn.waitFor({ state: 'visible', timeout: 30000 });
      await ctaBtn.click();
      await expect(welcomeModal).not.toBeVisible();
    } catch {
      // Modal didn't appear, continue
    }
  });
};
