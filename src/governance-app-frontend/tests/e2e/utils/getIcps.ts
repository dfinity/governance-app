import { expect, type Page, test } from '@playwright/test';

/**
 * Get test ICP using the "Buy Testnet ICP" button in the UI.
 * Only works in testnet/pocket-ic environment.
 */
export const getIcps = async (page: Page, amount: string) => {
  await test.step(`Get ${amount} test ICP`, async () => {
    await page.getByRole('button', { name: 'Buy Testnet ICP' }).click();
    await page.locator('#tokens-amount').fill(amount);
    await page.getByRole('button', { name: 'Top Up' }).click();
    await expect(page.getByText('Get Testnet ICP')).not.toBeVisible({ timeout: 30000 });
    // Wait for balance to update in the "Available" card.
    const availableCard = page.locator('[data-slot="card"]').filter({ hasText: 'Available' });
    await expect(availableCard.getByText(new RegExp(`${amount}(\\.\\d+)?\\s*ICP`))).toBeVisible();
  });
};
