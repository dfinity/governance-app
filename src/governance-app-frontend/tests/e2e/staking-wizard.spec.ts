import { expect, Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';
import { mockGovernanceErrorAfter } from './utils/mock-canister';

const openStakingWizard = async (page: Page) => {
  await test.step('Open staking wizard.', async () => {
    await page.getByTestId('empty-neurons-state-open-staking-wizard-btn').click();
    await expect(page.getByTestId('staking-wizard-dialog')).toBeVisible();
  });
};

test.describe('Staking Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await openApp({ page });
    await login({ page });
    await getIcps(page, '10');
    await page.getByRole('link', { name: 'Neurons' }).click();
    await openStakingWizard(page);
  });

  test('Validates the amount input', async ({ page }) => {
    // Empty amount shows error.
    await page.getByTestId('staking-wizard-next-btn').click();
    await expect(page.getByTestId('staking-wizard-amount-error')).toBeVisible();

    // Amount below the min ICP stake amount (1 ICP) shows error.
    await page.getByTestId('staking-wizard-amount-input').fill('0.99');
    await page.getByTestId('staking-wizard-next-btn').click();
    await expect(page.getByTestId('staking-wizard-amount-error')).toBeVisible();

    // Amount exceeding balance shows error.
    await page.getByTestId('staking-wizard-amount-input').fill('999999');
    await page.getByTestId('staking-wizard-next-btn').click();
    await expect(page.getByTestId('staking-wizard-amount-error')).toBeVisible();

    // Valid amount proceeds to step 2.
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();
    await expect(page.getByTestId('staking-wizard-dissolve-delay-step')).toBeVisible();
  });

  test('Navigates back through the wizard', async ({ page }) => {
    // Enter amount.
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();

    // Select non-default dissolve delay (8 Years = 96 months).
    await page.getByTestId('staking-wizard-delay-option-96').click();
    await page.getByTestId('staking-wizard-next-btn').click();

    // Verify we're on configuration.
    await expect(page.getByTestId('staking-wizard-configuration-step')).toBeVisible();

    // Go back to step 2, verify we're back on dissolve delay step.
    await page.getByTestId('staking-wizard-back-btn').click();
    await expect(page.getByTestId('staking-wizard-dissolve-delay-step')).toBeVisible();
    // The 8 Years button should be selected.
    await expect(page.getByTestId('staking-wizard-delay-option-96')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Go back to step 1, verify amount preserved.
    await page.getByTestId('staking-wizard-back-btn').click();
    await expect(page.getByTestId('staking-wizard-amount-input')).toHaveValue('5');
  });

  test('Resets the wizard when the modal is closed', async ({ page }) => {
    // Enter amount and proceed to step 2.
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();
    await expect(page.getByTestId('staking-wizard-dissolve-delay-step')).toBeVisible();

    // Try to close modal - confirmation dialog should appear.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('staking-wizard-close-confirmation')).toBeVisible();

    // Confirm close.
    await page.getByTestId('staking-wizard-close-confirmation-leave').click();
    await expect(page.getByTestId('staking-wizard-dialog')).not.toBeVisible();

    // Reopen, should reset to step 1.
    await openStakingWizard(page);
    await expect(page.getByTestId('staking-wizard-amount-input')).toHaveValue('');
  });

  test('Completes the staking flow successfully', async ({ page }) => {
    // Enter amount.
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();

    // Select dissolve delay (use default 2 years).
    await page.getByTestId('staking-wizard-next-btn').click();

    // Configure stake.
    await page.getByTestId('staking-wizard-create-btn').click();

    // Wait for success.
    await expect(page.getByTestId('staking-wizard-success')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('staking-wizard-done-btn').click();

    // Verify modal closed, empty state no longer visible.
    await expect(page.getByTestId('staking-wizard-dialog')).not.toBeVisible();
    await expect(page.getByTestId('empty-neurons-state')).not.toBeVisible();

    // Verify exactly 1 neuron card with correct values.
    const neuronCards = page.getByTestId('neuron-card');
    await expect(neuronCards).toHaveCount(1);
    await expect(neuronCards.getByTestId('neuron-card-staked-amount')).toHaveText(/5\.00.*ICP/i);
    await expect(neuronCards.getByTestId('neuron-card-dissolve-delay')).toHaveText(/2 years/i);
    await expect(neuronCards.getByTestId('neuron-state-badge')).toHaveText(/Locked/i);
    await expect(neuronCards.getByTestId('neuron-card-maturity-mode')).toHaveText(/Keep Available/i);
  });

  test('Recovers from errors in the staking flow', async ({ page }) => {
    // Mock governance to fail after first call (stakeNeuron succeeds, setDissolveDelay fails).
    const removeMock = await mockGovernanceErrorAfter({ page, skipCalls: 1 });

    // Complete wizard up to confirmation.
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();
    await page.getByTestId('staking-wizard-next-btn').click();
    await page.getByTestId('staking-wizard-create-btn').click();

    // Verify error state.
    await expect(page.getByTestId('staking-wizard-error')).toBeVisible({ timeout: 30000 });

    // Remove mock and retry.
    await removeMock();
    await page.getByTestId('staking-wizard-retry-btn').click();

    // Verify completes successfully.
    await expect(page.getByTestId('staking-wizard-success')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('staking-wizard-done-btn').click();

    // Verify exactly 1 neuron card with correct values.
    const neuronCards = page.getByTestId('neuron-card');
    await expect(neuronCards).toHaveCount(1);
    await expect(neuronCards.getByTestId('neuron-card-staked-amount')).toHaveText(/5\.00.*ICP/i);
    await expect(neuronCards.getByTestId('neuron-card-dissolve-delay')).toHaveText(/2 years/i);
    await expect(neuronCards.getByTestId('neuron-state-badge')).toHaveText(/Locked/i);
    await expect(neuronCards.getByTestId('neuron-card-maturity-mode')).toHaveText(/Keep Available/i);
  });
});
