import { expect, type Page, test } from '@playwright/test';

import { firstVisibleLocatorIndex } from './locator';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeEnabled();

    const [newTab] = await Promise.all([
      // Catches the new tab.
      page.waitForEvent('popup'),
      page.getByTestId('login-btn').click(),
    ]);

    // Wait for DOM to be ready (more reliable in containers than networkidle)
    await newTab.waitForLoadState('domcontentloaded');
    await expect(newTab).toHaveTitle(/Internet Identity/);

    // Create new identity.
    await newTab.getByRole('button', { name: 'Create Internet Identity' }).click();
    const passkeyBtn = newTab.getByRole('button', { name: 'Create Passkey' });
    const continueBtn = newTab.getByRole('button', { name: 'I saved it, continue' });
    const visibleIndex = await firstVisibleLocatorIndex([passkeyBtn, continueBtn]);

    if (visibleIndex === 1) {
      await continueBtn.click();
    } else {
      await passkeyBtn.click();
      await newTab.getByRole('button', { name: 'Create Passkey' }).click();
      await newTab.locator('input#captchaInput').fill('a');
      await newTab.getByRole('button', { name: 'Next' }).click();
      await newTab.getByRole('button', { name: 'Continue' }).click();
    }

    // Wait until user is redirected back and tab closes.
    await newTab.waitForEvent('close');
    await expect(newTab.isClosed()).toBe(true);

    // Close the welcome modal if it appears.
    const welcomeModal = page.getByTestId('welcome-modal');
    try {
      await welcomeModal.waitFor({ state: 'visible', timeout: 30000 });
      await page.getByTestId('welcome-modal-cta-btn').click();
      await expect(welcomeModal).not.toBeVisible();
    } catch {
      // Modal didn't appear, continue
    }
  });
};
