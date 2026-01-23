import { expect, type Page, test } from '@playwright/test';

/**
 * Get test ICP using the "Buy Testnet ICP" button in the UI.
 * Only works in testnet/pocket-ic environment.
 */
export const getIcps = async (page: Page, amount: string) => {
  await test.step(`Get ${amount} test ICP`, async () => {
    await page.getByTestId('get-testnet-icp-trigger-btn').click();
    await page.getByTestId('get-testnet-icp-amount-input').fill(amount);
    await page.getByTestId('get-testnet-icp-submit-btn').click();
    await expect(page.getByTestId('get-testnet-icp-dialog')).not.toBeVisible({ timeout: 30000 });
    // Wait for balance to update in the "Available" card.
    const availableCard = page.getByTestId('available-balance-card');
    await expect(availableCard.getByText(new RegExp(`${amount}(\\.\\d+)?\\s*ICP`))).toBeVisible({
      timeout: 30000,
    });
  });
};
