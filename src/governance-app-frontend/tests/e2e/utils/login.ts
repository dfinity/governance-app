import { expect, test, type Page } from '@playwright/test';
import { firstVisibleLocatorIndex } from './e2e';

export const login = async ({ page }: { page: Page }) => {
  await test.step('Login', async () => {
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeEnabled();

    const [newTab] = await Promise.all([
      page.waitForEvent('popup'), // catches the new tab
      page.getByRole('button', { name: 'Login' }).click(),
    ]);

    await newTab.waitForLoadState('networkidle'); // ensures all assets loaded
    await expect(newTab).toHaveTitle(/Internet Identity/);

    // create new identity
    await newTab.getByRole('button', { name: 'Create Internet Identity' }).click();

    const passkeyBtn = newTab.getByRole('button', { name: 'Create Passkey' });
    const continueBtn = newTab.getByRole('button', { name: 'I saved it, continue' });
    const visibleIndex = await firstVisibleLocatorIndex([passkeyBtn, continueBtn]);

    if (visibleIndex === 1) {
      console.log('🧪 ii: I saved it, continue', await newTab.title());
      await continueBtn.click();
    } else {
      console.log('🧪 ii: Create Passkey', await newTab.title());
      await passkeyBtn.click();
      await newTab.getByRole('button', { name: 'Create Passkey' }).click();
      await newTab.locator('input#captchaInput').fill('a');
      await newTab.getByRole('button', { name: 'Next' }).click();
      await newTab.getByRole('button', { name: 'Continue' }).click();
    }

    await newTab.waitForEvent('close'); // wait until user is redirected back and tab closes
    await expect(newTab.isClosed()).toBe(true);
  });
};
