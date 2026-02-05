import { expect, type Page, test } from '@playwright/test';

import { firstVisibleLocatorIndex } from './locator';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    const loginBtn = page.getByTestId('login-btn');
    
    console.log('Waiting for login button to be visible and enabled...');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();
    
    // Give React extra time to fully hydrate and attach event handlers
    console.log('Waiting for React to be fully interactive...');
    await page.waitForTimeout(3000);
    
    console.log('Attempting to click login button...');
    const [newTab] = await Promise.all([
      page.waitForEvent('popup', { timeout: 60000 }),
      loginBtn.click({ force: true }), // force: true bypasses actionability checks
    ]);
    console.log('✅ Popup opened successfully!');

    // Ensures all assets loaded.
    await newTab.waitForLoadState('load');
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
