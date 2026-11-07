import { expect, type Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { login } from './utils/login';

const II_BACKEND_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
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

  await test.step('Opens Internet Identity again after its window closes before it loads.', async () => {
    // A page without the scripts of Internet Identity, so the first window never answers.
    await page.context().route(
      (url) => url.pathname === '/authorize',
      (route) =>
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>II</title>' }),
      { times: 1 },
    );

    const [firstWindow] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('login-btn').click(),
    ]);
    await firstWindow.close();

    const [secondWindow] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('login-restart-btn').click(),
    ]);
    await secondWindow.getByRole('button', { name: 'Create', exact: true }).waitFor();
    await secondWindow.close();

    await expectLoginPage(page);
    await expect(page.getByText('Authenticating with Internet Identity')).not.toBeVisible();
  });
});

test('Hides the reopen prompt once Internet Identity answers', async ({ page }) => {
  await openApp({ page });

  // Holds the first delegation call of the app. The Internet Identity window is another page.
  let releaseMint = () => {};
  const mintHeld = new Promise<void>((resolve) => (releaseMint = resolve));
  const mintCalled = new Promise<void>((resolve) => {
    void page.route(
      (url) => url.pathname.endsWith(`/canister/${II_BACKEND_CANISTER_ID}/call`),
      async (route) => {
        resolve();
        await mintHeld;
        await route.continue();
      },
    );
  });

  const loggedIn = login({ page });
  await mintCalled;

  await expect.poll(() => page.context().pages().length).toBe(1);
  // Longer than the delay of the prompt.
  await page.waitForTimeout(3_500);
  await expect(page.getByTestId('login-restart-btn')).toBeHidden();

  releaseMint();
  await loggedIn;
  await expectDashboard(page);
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

test('Follows a login and a logout in another tab', async ({ page }) => {
  await openApp({ page });
  const otherTab = await page.context().newPage();
  await openApp({ page: otherTab });

  await test.step('Follows a login in the other tab.', async () => {
    await login({ page });
    await expectDashboard(page);
    await expectDashboard(otherTab);
  });

  await test.step('Follows a logout in the other tab, with no notice.', async () => {
    await page.goto('/settings');
    await page.getByTestId('logout-btn').click();
    await expectLoginPage(page);

    await expectLoginPage(otherTab);
    await expect(otherTab.getByText(SESSION_EXPIRED)).not.toBeVisible();
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
