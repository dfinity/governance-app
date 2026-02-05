import { expect, type Page, test } from '@playwright/test';

import { firstVisibleLocatorIndex } from './locator';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    const loginBtn = page.getByTestId('login-btn');
    
    // Wait for login button to be fully interactive
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();
    
    // Extra wait to ensure React event handlers are attached
    console.log('Waiting for app to be fully interactive...');
    await page.waitForTimeout(2000);
    
    console.log('Clicking login button...');
    const popupPromise = page.waitForEvent('popup', { timeout: 45000 });
    await loginBtn.click();
    console.log('Button clicked, waiting for popup...');
    
    const newTab = await popupPromise;
    console.log('Popup opened!');

    // Wait for popup to fully load (including scripts) - more reliable than networkidle in containers
    await newTab.waitForLoadState('load', { timeout: 60000 });
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
