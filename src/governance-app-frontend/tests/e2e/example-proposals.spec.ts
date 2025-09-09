import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.type()}: ${msg.text()}`);
  });

  console.log('✅ Page maybe loaded');

  // page.on('request', (req) => {
  //   console.log('🚀HEADERS:');
  //   console.log(req.method());
  //   console.log(req.headers());
  //   console.log(req.url());
  // });

  page.on('response', async (response) => {
    const url = response.url();
    console.log('🚀 RESPONSE:', url, (await response.text()).slice(0, 100));
    // if (url.endsWith('index-B78zhtbS.js')) {
    // const text = (await response.text()).slice(0, 100);
    // console.log('JS file content starts with:', text);
    // }
  });

  // await page.goto('http://localhost:3000/nns/proposals');
  await page.goto('http://lqy7q-dh777-77777-aaaaq-cai.localhost:8080');

  await expect(page).toHaveTitle(/The Governance App/);
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });

  await page.getByText('NNS', { exact: true }).click();
  await page.getByText('See Proposals', { exact: true }).click();

  await expect(page.getByTestId('proposals')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('proposals').locator('a')).toHaveCount(6);
});
