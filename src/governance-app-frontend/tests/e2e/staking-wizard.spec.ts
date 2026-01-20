import { expect, Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';
import { mockGovernanceErrorAfter } from './utils/mock-canister';

const openStakingWizard = async (page: Page) => {
  await test.step('Open staking wizard', async () => {
    await page.getByRole('button', { name: 'Create your first neuron' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
};

test.describe('Staking Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await openApp({ page });
    await login({ page });
    await getIcps(page, '10');
    await page.getByRole('link', { name: 'Stakes' }).dblclick();
    await openStakingWizard(page);
  });

  test('Validates the amount input', async ({ page }) => {
    // Empty amount shows error
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Minimum stake is/)).toBeVisible();

    // Amount exceeding balance shows error
    await page.locator('input[type="number"]').fill('999999');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Insufficient balance')).toBeVisible();

    // Valid amount proceeds to step 2
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();
  });

  test('Navigates back through the wizard', async ({ page }) => {
    // Enter amount
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();

    // Select non-default dissolve delay (8 Years)
    await page.getByRole('button', { name: /8 Years/i }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // Verify we're on configuration
    await expect(page.getByText('Configure Stake')).toBeVisible();

    // Go back to step 2, verify we're back on dissolve delay step
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();
    // The 8 Years button should have the selected style (border-green-600)
    await expect(page.getByRole('button', { name: /8 Years/i })).toHaveClass(/border-green-600/);

    // Go back to step 1, verify amount preserved
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('input[type="number"]')).toHaveValue('5');
  });

  test('Resets the wizard when the modal is closed', async ({ page }) => {
    // Enter amount and proceed to step 2
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Set Dissolve Delay')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Reopen, should reset to step 1
    await openStakingWizard(page);
    await expect(page.locator('input[type="number"]')).toHaveValue('');
  });

  test('Completes the staking flow successfully', async ({ page }) => {
    // Enter amount
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Next' }).click();

    // Select dissolve delay (use default 2 years)
    await page.getByRole('button', { name: 'Next' }).click();

    // Configure stake
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for success
    await expect(page.getByText("You're now earning rewards!")).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Done' }).click();

    // Verify modal closed, neuron card appears
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Create your first neuron')).not.toBeVisible();

    // Verify neuron card shows correct values
    const neuronCard = page.locator('[data-slot="card"]').filter({ hasText: 'Neuron' });
    await expect(neuronCard.getByText('5.00 ICP')).toBeVisible(); // Staked amount
    await expect(neuronCard.getByText(/2 years/i)).toBeVisible(); // Dissolve delay
    await expect(neuronCard.getByText('Locked')).toBeVisible(); // Initial state
    await expect(neuronCard.getByText('Keep Liquid')).toBeVisible(); // Maturity mode
  });

  test('Recovers from errors in the staking flow', async ({ page }) => {
    // Mock governance to fail after first call (stakeNeuron succeeds, setDissolveDelay fails)
    const removeMock = await mockGovernanceErrorAfter({ page, skipCalls: 1 });

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
