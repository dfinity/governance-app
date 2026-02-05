import { expect, type Page, test } from '@playwright/test';

import { firstVisibleLocatorIndex } from './locator';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    const loginBtn = page.getByTestId('login-btn');

    // Log any console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });

    console.log('Waiting for login button to be visible and enabled...');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();

    // Check button info
    const btnText = await loginBtn.textContent();
    console.log('Login button text:', btnText);

    // Give React extra time to fully hydrate and attach event handlers
    console.log('Waiting 5s for React to be fully interactive...');
    await page.waitForTimeout(5000);

    // Set up popup listener BEFORE clicking
    console.log('Setting up popup listener...');
    const popupPromise = page.waitForEvent('popup', { timeout: 60000 });

    // Try clicking with JavaScript directly
    console.log('Clicking login button via JavaScript...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="login-btn"]');
      if (btn) {
        console.log('Found button, clicking...');
        (btn as HTMLElement).click();
      } else {
        console.log('Button not found!');
      }
    });

    console.log('Button clicked, waiting for popup...');
    const newTab = await popupPromise;
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
