import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  await page.goto('http://localhost:3000/nns/proposals');

  await expect(page).toHaveTitle(/The Governance App/);
  await expect(page.getByTestId('main-layout')).toBeVisible();

  await expect(page.getByTestId('proposals')).toBeVisible();
  await expect(page.getByTestId('proposals').locator('a')).toHaveCount(6);
});
