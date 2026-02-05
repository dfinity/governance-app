import { expect, type Page, test } from '@playwright/test';

import { firstVisibleLocatorIndex } from './locator';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Can log in.', async () => {
    const loginBtn = page.getByTestId('login-btn');

    console.log('Waiting for login button...');
    // Wait for login button to be fully interactive
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();

    // Wait for any network activity to settle
    console.log('Waiting for app to stabilize...');
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {
      console.log('Network not idle after 10s, proceeding anyway', e);
    }

    // Extra buffer to ensure React event handlers are fully attached
    await page.waitForTimeout(3000);

    console.log('Clicking login button and waiting for popup...');
    const [newTab] = await Promise.all([
      page.waitForEvent('popup', { timeout: 60000 }),
      loginBtn.click(),
    ]);
    console.log('✅ Popup opened!');
    console.log('Popup URL:', newTab.url());

    // Listen for console errors in the popup
    newTab.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Popup console error: ${msg.text()}`);
      }
    });

    // Wait for popup to fully load (including scripts) - more reliable than networkidle in containers
    try {
      await newTab.waitForLoadState('load', { timeout: 60000 });
      console.log('Popup loaded! Title:', await newTab.title());
    } catch (e) {
      console.log('Popup failed to load. Current URL:', newTab.url());
      const content = await newTab.content();
      console.log('Popup page content:', content.substring(0, 500));
      throw e;
    }

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
