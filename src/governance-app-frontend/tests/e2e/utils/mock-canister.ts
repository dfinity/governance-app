import type { Page, Route } from '@playwright/test';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';

/**
 * Mock governance canister calls to fail after N successful calls.
 * Useful for testing error recovery in multi-step flows.
 *
 * Note: Candid encodes variant names as numeric hashes, not strings,
 * so we can't match specific commands by name in the binary payload.
 *
 * @param page - Playwright page
 * @param skipCalls - Number of calls to let through before failing (default: 1)
 * @returns Cleanup function to remove the mock
 */
export const mockGovernanceErrorAfter = async ({
  page,
  skipCalls = 1,
}: {
  page: Page;
  skipCalls?: number;
}): Promise<() => Promise<void>> => {
  let callCount = 0;

  const handler = async (route: Route) => {
    callCount++;

    if (callCount > skipCalls) {
      await route.fulfill({
        status: 500,
        contentType: 'application/cbor',
        body: Buffer.from([]),
      });
    } else {
      await route.continue();
    }
  };

  await page.route(`**/canister/${CANISTER_ID_NNS_GOVERNANCE}/call`, handler);

  return async () => {
    await page.unroute(`**/canister/${CANISTER_ID_NNS_GOVERNANCE}/call`, handler);
  };
};
