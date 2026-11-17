import { expect, type Page, test } from '@playwright/test';

// The browser fetches the files, because Node does not resolve `*.localhost` on CI.
const getBody = async (page: Page, path: string) => {
  const response = await page.goto(path);
  return (await response?.text()) ?? '';
};

// Only the mainnet build, which has no `testnet` feature, serves these files.
test.describe('Service discoverability', () => {
  test('a local deployment serves no manifest', async ({ page }) => {
    expect(await getBody(page, '/.well-known/ic-architecture')).not.toContain('"canisters"');
  });

  test('a local deployment serves no derivation origin', async ({ page }) => {
    expect(await getBody(page, '/.well-known/ii-derivation-origin')).not.toContain(
      'https://nns.ic0.app',
    );
  });
});
