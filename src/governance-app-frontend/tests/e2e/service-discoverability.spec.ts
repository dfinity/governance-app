import { expect, test } from '@playwright/test';

// Only the mainnet build, which has no `testnet` feature, serves these files.
test.describe('Service discoverability', () => {
  test('a local deployment serves no manifest', async ({ request }) => {
    const response = await request.get('/.well-known/ic-architecture');
    expect(await response.text()).not.toContain('"canisters"');
  });

  test('a local deployment serves no derivation origin', async ({ request }) => {
    const response = await request.get('/.well-known/ii-derivation-origin');
    expect(await response.text()).not.toContain('https://nns.ic0.app');
  });
});
