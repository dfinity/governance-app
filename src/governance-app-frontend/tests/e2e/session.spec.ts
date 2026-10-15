import { expect, type Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';

const SESSION_EXPIRED = 'Session expired, you have been logged out. Please log in again.';

const expectLoginPage = async (page: Page) => {
  await expect(page.getByTestId('login-btn')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('login-btn')).toBeEnabled();
};

const expectDashboard = async (page: Page) => {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.getByTestId('login-btn')).not.toBeVisible();
};

// Makes Internet Identity forget the identities created in this browser context, so the next
// login starts from the same screen as the first one.
const forgetIdentities = async (page: Page, identityProviderOrigin: string) => {
  const identityProvider = await page.context().newPage();
  await identityProvider.goto(identityProviderOrigin);
  await identityProvider.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(
        ({ name }) =>
          new Promise((resolve) => {
            if (!name) return resolve(undefined);
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve(undefined);
          }),
      ),
    );
  });
  await identityProvider.close();
};

test('Protects routes and recovers from a closed Internet Identity window', async ({ page }) => {
  await test.step('Redirects a protected route to the login page.', async () => {
    await openApp({ page, url: '/dashboard' });
    await expectLoginPage(page);
    await expect(page).toHaveURL(/redirect=%2Fdashboard/);
  });

  await test.step('Enables the login button again after the window closes.', async () => {
    const [identityProvider] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('login-btn').click(),
    ]);
    await expect(page.getByTestId('login-btn')).toBeDisabled();

    // The auth client sees the window close only after Internet Identity answers it.
    await identityProvider.getByRole('button', { name: 'Create', exact: true }).waitFor();
    await identityProvider.close();

    await expectLoginPage(page);
    await expect(page.getByText('Authenticating with Internet Identity')).not.toBeVisible();
  });
});

test('Keeps the session on reload, logs out, and logs in again', async ({ page }) => {
  await openApp({ page });
  const identityProviderOrigin = await login({ page });
  await expectDashboard(page);

  await test.step('Keeps the session after a reload.', async () => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByTestId('logout-btn')).toBeVisible({ timeout: 30000 });
  });

  await test.step('Logs out to the login page.', async () => {
    await page.getByTestId('logout-btn').click();
    await expectLoginPage(page);
    await expect(page.getByText(SESSION_EXPIRED)).not.toBeVisible();
  });

  await test.step('Protects routes again after the logout.', async () => {
    await page.goto('/dashboard');
    await expectLoginPage(page);
    await expect(page).toHaveURL(/redirect=%2Fdashboard/);
  });

  await test.step('Logs in again in the same page.', async () => {
    await forgetIdentities(page, identityProviderOrigin);
    await login({ page });
    await expectDashboard(page);
  });
});

test('Logs out when the session expires', async ({ page }) => {
  // The fake clock runs in real time until the test moves it.
  await page.clock.install();

  await openApp({ page });
  await login({ page });
  await expectDashboard(page);

  await page.clock.fastForward('01:00:00');

  await expectLoginPage(page);
  await expect(page.getByText(SESSION_EXPIRED)).toBeVisible();
});
