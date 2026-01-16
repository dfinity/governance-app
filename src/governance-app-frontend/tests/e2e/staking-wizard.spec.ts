import { expect, type Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';
import { mockGovernanceErrorAfter } from './utils/mock-canister';

const openStakingWizard = async (page: Page) => {
  await test.step('Open staking wizard', async () => {
    await page.getByRole('button', { name: 'Stake ICP' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
};

test.describe('Staking Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await openApp({ page });
    await login({ page });
  });

  test('1. Validation - Amount Step', async ({ page }) => {
    await getIcps(page, '10');

    // Navigate to stakes page
    await page.getByRole('link', { name: 'Stakes' }).click();
    await openStakingWizard(page);

    // Test: Empty amount shows error
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Amount must be greater than the transaction fee/)).toBeVisible();

    // Test: Amount exceeding balance shows error
    await page.locator('input[type="number"]').fill('999999');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Insufficient balance')).toBeVisible();

    // Test: Valid amount proceeds to step 2
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();
  });

  test('2. Navigation - Back Button', async ({ page }) => {
    await getIcps(page, '10');

    await page.getByRole('link', { name: 'Stakes' }).click();
    await openStakingWizard(page);

    // Step 1: Enter amount
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Select non-default dissolve delay (8 Years)
    await page.getByRole('button', { name: /8 Years/i }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Verify we're on configuration
    await expect(page.getByText('Configure Stake')).toBeVisible();

    // Go back to step 2 - verify we're back on dissolve delay step
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();
    // The 8 Years button should have the selected style (border-green-600)
    await expect(page.getByRole('button', { name: /8 Years/i })).toHaveClass(/border-green-600/);

    // Go back to step 1 - verify amount preserved
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('input[type="number"]')).toHaveValue('5');
  });

  test('3. Modal Reset on Close', async ({ page }) => {
    await getIcps(page, '10');

    await page.getByRole('link', { name: 'Stakes' }).click();
    await openStakingWizard(page);

    // Enter amount and proceed to step 2
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Reopen - should reset to step 1
    await openStakingWizard(page);
    await expect(page.locator('input[type="number"]')).toHaveValue('');
  });

  test('4. Happy Path - Successful Staking', async ({ page }) => {
    await getIcps(page, '10');

    await page.getByRole('link', { name: 'Stakes' }).click();
    await openStakingWizard(page);

    // Step 1: Amount
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Dissolve Delay (use default 2 years)
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Configuration (use defaults)
    await page.getByRole('button', { name: 'Create' }).click();

    // Step 4: Confirmation - wait for success
    await expect(page.getByText("You're now earning rewards!")).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Done' }).click();

    // Verify modal closed and neuron card appears
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Create your first neuron')).not.toBeVisible();

    // Verify neuron card shows correct values
    const neuronCard = page.locator('[data-slot="card"]').filter({ hasText: 'Neuron' });
    await expect(neuronCard.getByText('5.00 ICP')).toBeVisible(); // Staked amount
    await expect(neuronCard.getByText(/2 years/i)).toBeVisible(); // Dissolve delay
    await expect(neuronCard.getByText('Locked')).toBeVisible(); // Initial state
    await expect(neuronCard.getByText('Keep Liquid')).toBeVisible(); // Maturity mode
  });

  test('5. Error/Retry Flow', async ({ page }) => {
    await getIcps(page, '10');

    await page.getByRole('link', { name: 'Stakes' }).click();

    // Mock governance to fail after first call (stakeNeuron succeeds, setDissolveDelay fails)
    const removeMock = await mockGovernanceErrorAfter({ page, skipCalls: 1 });

    await openStakingWizard(page);

    // Complete wizard up to confirmation
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify error state
    await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Setting lock period/)).toBeVisible();

    // Remove mock and retry
    await removeMock();
    await page.getByRole('button', { name: 'Try Again' }).click();

    // Verify completes successfully
    await expect(page.getByText("You're now earning rewards!")).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Done' }).click();

    // Verify neuron card shows correct values
    const neuronCard = page.locator('[data-slot="card"]').filter({ hasText: 'Neuron' });
    await expect(neuronCard.getByText('5.00 ICP')).toBeVisible(); // Staked amount
    await expect(neuronCard.getByText(/2 years/i)).toBeVisible(); // Dissolve delay
    await expect(neuronCard.getByText('Locked')).toBeVisible(); // Initial state
    await expect(neuronCard.getByText('Keep Liquid')).toBeVisible(); // Maturity mode
  });
});
