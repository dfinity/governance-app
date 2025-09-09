import { expect, Locator, test, type Page } from '@playwright/test';
import { log } from 'console';

// pick whichever is visible first
const firstVisibleLocatorIndex = (locators: Locator[]): Promise<number> =>
  Promise.race(
    locators.map((locator, index) =>
      locator.waitFor({ state: 'visible', timeout: 5000 }).then(() => index),
    ),
  ).catch(() => -1);

export const login = async ({ page }: { page: Page }) => {
  await test.step('Login', async () => {
    console.log('✅ Login 0');
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(page.getByTestId('login-btn')).toBeEnabled();

    console.log('✅ Login 1');
    const [newTab] = await Promise.all([
      page.waitForEvent('popup'), // catches the new tab
      page.getByRole('button', { name: 'Login' }).click(),
    ]);
    console.log('✅ Login 2');

    await newTab.waitForLoadState('networkidle'); // ensures all assets loaded

    await expect(newTab).toHaveTitle(/Internet Identity/);
    console.log('✅ new title', await newTab.title());
    console.log(await newTab.innerHTML('body'));

    // create new identity
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

    // if (await newTab.getByRole('button', { name: 'I saved it, continue' }).isVisible()) {
    //   await newTab.getByRole('button', { name: 'I saved it, continue' }).click();
    // } else {
    // }

    await newTab.waitForEvent('close'); // wait until user is redirected back and tab closes
    await expect(newTab.isClosed()).toBe(true);
  });
};
