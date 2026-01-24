import { Browser, expect, Page, test } from '@playwright/test';

import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';

const openNeuronDetailModal = async (page: Page) => {
  await page.getByTestId('neuron-card').first().click();
  await expect(page.getByTestId('neuron-detail-modal')).toBeVisible();
};

const closeModal = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('neuron-detail-modal')).not.toBeVisible();
};

// Serial: tests share the same page/identity and neuron, so they must run in order.
// We do this to avoid re-staking the neuron between tests, that takes time.
test.describe.serial('Neuron Detail Modal', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();

    await openApp({ page });
    await login({ page });
    await getIcps(page, '10');
    await page.getByRole('link', { name: 'Stakes' }).dblclick();

    await page.getByTestId('empty-neurons-state-open-staking-wizard-btn').click();
    await page.getByTestId('staking-wizard-amount-input').fill('5');
    await page.getByTestId('staking-wizard-next-btn').click();
    await page.getByTestId('staking-wizard-next-btn').click();
    await page.getByTestId('staking-wizard-create-btn').click();
    await expect(page.getByTestId('staking-wizard-success')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('staking-wizard-done-btn').click();

    await expect(page.getByTestId('neuron-card')).toBeVisible();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Modal Opening & URL State', async () => {
    await test.step('Opens modal with correct neuron data when card is clicked', async () => {
      await openNeuronDetailModal(page);
      await expect(page.getByTestId('neuron-detail-staked-amount')).toHaveText(/5\.00.*ICP/i);
      await expect(page.getByTestId('neuron-detail-dissolve-delay')).toHaveText(/2 years/i);
      await closeModal(page);
    });

    await test.step('URL contains stakeId when modal is open and reopens on refresh', async () => {
      await openNeuronDetailModal(page);
      const url = page.url();
      expect(url).toContain('stakeId=');
      await page.reload();
      await expect(page.getByTestId('neuron-detail-modal')).toBeVisible();
      await expect(page.getByTestId('neuron-detail-staked-amount')).toHaveText(/5\.00.*ICP/i);
      await closeModal(page);
      const urlAfterClose = page.url();
      expect(urlAfterClose).not.toContain('stakeId=');
    });
  });

  test('Increase Stake', async () => {
    await test.step('Opens view, navigates, and URL state persists', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-increase-stake').click();
      const url = page.url();
      expect(url).toContain('action=increaseStake');
      await expect(page.getByTestId('increase-stake-amount-input')).toBeVisible();
      await page.getByTestId('neuron-detail-back-btn').click();
      await expect(page.getByTestId('increase-stake-amount-input')).not.toBeVisible();
      await expect(page.getByTestId('neuron-detail-action-increase-stake')).toBeVisible();
      await page.getByTestId('neuron-detail-action-increase-stake').click();
      await page.reload();
      await expect(page.getByTestId('increase-stake-amount-input')).toBeVisible();
      await closeModal(page);
    });

    await test.step('Validates input and shows current values', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-increase-stake').click();
      await expect(page.getByTestId('increase-stake-current-stake')).toHaveText(/5/);
      await page.getByTestId('increase-stake-confirm-btn').click();
      await expect(page.getByTestId('increase-stake-error')).toBeVisible();
      await page.getByTestId('increase-stake-amount-input').fill('0.5');
      await page.getByTestId('increase-stake-confirm-btn').click();
      await expect(page.getByTestId('increase-stake-error')).toBeVisible();
      await closeModal(page);
    });

    await test.step('Successfully increases stake', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-increase-stake').click();
      await page.getByTestId('increase-stake-amount-input').fill('1');
      await page.getByTestId('increase-stake-confirm-btn').click();
      await expect(page.getByTestId('increase-stake-amount-input')).not.toBeVisible({
        timeout: 30000,
      });
      await closeModal(page);
      const neuronCard = page.getByTestId('neuron-card');
      await expect(neuronCard.getByTestId('neuron-card-staked-amount')).toHaveText(/6\.00.*ICP/i);
    });
  });

  test('Increase Delay', async () => {
    await test.step('Opens view, shows current delay, and URL persists', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-increase-delay').click();
      const url = page.url();
      expect(url).toContain('action=increaseDelay');
      await expect(page.getByTestId('increase-delay-option-24')).toBeVisible();
      await page.getByTestId('neuron-detail-back-btn').click();
      await expect(page.getByTestId('neuron-detail-action-increase-delay')).toBeVisible();
      await page.getByTestId('neuron-detail-action-increase-delay').click();
      await page.reload();
      await expect(page.getByTestId('increase-delay-option-24')).toBeVisible();
      await closeModal(page);
    });

    await test.step('Successfully increases delay', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-increase-delay').click();
      await page.getByTestId('increase-delay-option-48').click();
      await page.getByTestId('increase-delay-confirm-btn').click();
      await expect(page.getByTestId('increase-delay-option-24')).not.toBeVisible({
        timeout: 30000,
      });
      await closeModal(page);
      const neuronCard = page.getByTestId('neuron-card');
      // Text can be: 3 years, 365 days or 4 years, testing for both
      await expect(neuronCard.getByTestId('neuron-card-dissolve-delay')).toHaveText(/[34] years/i);
    });
  });

  test('Maturity Mode', async () => {
    await test.step('Opens view, shows current mode, and URL persists', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-maturity-mode').click();
      const url = page.url();
      expect(url).toContain('action=maturityMode');
      await expect(page.getByTestId('segmented-toggle')).toBeVisible();
      await page.getByTestId('neuron-detail-back-btn').click();
      await expect(page.getByTestId('neuron-detail-action-maturity-mode')).toBeVisible();
      await page.getByTestId('neuron-detail-action-maturity-mode').click();
      await page.reload();
      await expect(page.getByTestId('segmented-toggle')).toBeVisible();
      await closeModal(page);
    });

    await test.step('Confirm button disabled when no change', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-maturity-mode').click();
      await expect(page.getByTestId('maturity-mode-confirm-btn')).toBeDisabled();
      await closeModal(page);
    });

    await test.step('Successfully changes mode to auto-stake', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-maturity-mode').click();
      const toggle = page.getByTestId('segmented-toggle');
      await toggle.getByRole('radio', { name: /auto-stake/i }).click();
      await expect(page.getByTestId('maturity-mode-confirm-btn')).toBeEnabled();
      await page.getByTestId('maturity-mode-confirm-btn').click();
      await expect(page.getByTestId('segmented-toggle')).not.toBeVisible({ timeout: 30000 });
      await closeModal(page);
      const neuronCard = page.getByTestId('neuron-card');
      await expect(neuronCard.getByTestId('neuron-card-maturity-mode')).toHaveText(/Auto-Stake/i);
    });
  });

  test('Dissolve', async () => {
    await test.step('Opens view, shows start dissolving for locked neuron, and URL persists', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-start-dissolving').click();
      const url = page.url();
      expect(url).toContain('action=dissolve');
      await expect(page.getByTestId('dissolve-confirm-btn')).toBeVisible();
      await page.reload();
      await expect(page.getByTestId('dissolve-confirm-btn')).toBeVisible();
      await closeModal(page);
    });

    await test.step('Successfully starts and stops dissolving', async () => {
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-start-dissolving').click();
      await page.getByTestId('dissolve-confirm-btn').click();
      await expect(page.getByTestId('dissolve-confirm-btn')).not.toBeVisible({ timeout: 30000 });
      await closeModal(page);
      const neuronCard = page.getByTestId('neuron-card');
      await expect(neuronCard.getByTestId('neuron-state-badge')).toHaveText(/Dissolving/i);
      await openNeuronDetailModal(page);
      await page.getByTestId('neuron-detail-action-stop-dissolving').click();
      await page.getByTestId('dissolve-confirm-btn').click();
      await expect(page.getByTestId('dissolve-confirm-btn')).not.toBeVisible({ timeout: 30000 });
      await closeModal(page);
      await expect(neuronCard.getByTestId('neuron-state-badge')).toHaveText(/Locked/i);
    });
  });
});
