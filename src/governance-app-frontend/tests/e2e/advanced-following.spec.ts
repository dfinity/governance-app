import { Topic } from '@icp-sdk/canisters/nns';
import { Browser, expect, Page, test } from '@playwright/test';

import { TOP_LEVEL_TOPICS } from '../../src/features/voting/data/topics';
import { openApp } from './utils/app';
import { getIcps } from './utils/getIcps';
import { login } from './utils/login';
import { navigateTo } from './utils/navigate';

const NEURON_STAKE = '1';
const NEURONS_TO_CREATE = 3;
const TOP_LEVEL_IDS = new Set(TOP_LEVEL_TOPICS.map((t) => t.topic));

const stakeNeuron = async (page: Page, isFirst: boolean) => {
  if (isFirst) {
    await page.getByTestId('empty-neurons-state-open-staking-wizard-btn').click();
  } else {
    await page.getByTestId('staking-wizard-trigger-btn').click();
  }
  await page.getByTestId('staking-wizard-amount-input').fill(NEURON_STAKE);
  await page.getByTestId('staking-wizard-next-btn').click();
  await page.getByTestId('staking-wizard-next-btn').click();
  await page.getByTestId('staking-wizard-create-btn').click();
  await expect(page.getByTestId('staking-wizard-success')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('staking-wizard-done-btn').click();
  await page.waitForTimeout(500);
};

const getNeuronIds = async (page: Page): Promise<string[]> => {
  const ids: string[] = [];
  const cards = page.getByTestId('neuron-card');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    await cards.nth(i).click();
    await expect(page.getByTestId('neuron-detail-modal')).toBeVisible();
    const url = new URL(page.url());
    const id = url.searchParams.get('neuronId')?.replace(/"/g, '');
    if (id) ids.push(id);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('neuron-detail-modal')).not.toBeVisible();
  }
  return ids;
};

const addCustomFollowee = async (page: Page, neuronId: string) => {
  await page.getByTestId('picker-custom-id-input').fill(neuronId);
  await page.getByTestId('picker-custom-id-add').click();
};

type TopicExpectation = { topic: Topic; text: RegExp; individualTopics?: TopicExpectation[] };

/**
 * Opens each neuron's detail modal and verifies the "Following" row.
 * Without expectations: checks "Not set" text.
 * With expectations: clicks "View details", expands each topic row to verify summary text,
 * and optionally checks individual topic rows inside the "All Other Topics" section.
 */
const verifyAllNeuronsFollowing = async (
  page: Page,
  neuronCount: number,
  expectedTopics?: TopicExpectation[],
) => {
  await navigateTo(page, 'neurons');

  for (let i = 0; i < neuronCount; i++) {
    await page.getByTestId('neuron-card').nth(i).click();
    await expect(page.getByTestId('neuron-detail-modal')).toBeVisible();

    const followingRow = page.getByTestId('neuron-detail-following');
    await expect(followingRow).toBeVisible();

    if (!expectedTopics) {
      await expect(followingRow).toContainText(/set up following/i);
      await page.keyboard.press('Escape');
    } else {
      await followingRow.getByText(/view details/i).click();

      for (const { topic, text, individualTopics } of expectedTopics) {
        const row = page.getByTestId(`topic-row-${topic}`);
        await expect(row).toContainText(text);

        if (individualTopics) {
          await row.click();
          for (const { topic: indTopic, text: indText } of individualTopics) {
            await expect(page.getByTestId(`topic-row-${indTopic}`)).toContainText(indText);
          }
          await row.click();
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    await expect(page.getByTestId('neuron-detail-modal')).not.toBeVisible();
  }
};

const applyPickerFlow = async (page: Page, neuronId: string, topics: Topic[]) => {
  await page.getByTestId('set-followees-btn').click();

  await addCustomFollowee(page, neuronId);
  await page.getByTestId('picker-next-btn').click();

  const hasIndividual = topics.some((t) => !TOP_LEVEL_IDS.has(t));
  if (hasIndividual) {
    await page.getByTestId('picker-individual-topics-toggle').click();
  }

  for (const topic of topics) {
    await page.getByTestId(`picker-topic-${topic}`).click();
  }
  await page.getByTestId('picker-apply-btn').click();

  await page.getByTestId('picker-confirm-btn').click();
  await expect(page.getByTestId('followee-picker-dialog')).not.toBeVisible({ timeout: 30000 });
};

// Serial since the tests build on each other
test.describe.serial('Advanced Following', () => {
  test.setTimeout(210_000); // Longer test timeout since this one is more involved

  let page: Page;
  let neuronIds: string[];

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    test.setTimeout(210_000); // Longer test timeout, same reason, but "beforeAll" is applied on its own

    page = await browser.newPage();

    await openApp({ page });
    await login({ page });
    await getIcps(page, '30');
    await navigateTo(page, 'neurons');

    for (let i = 0; i < NEURONS_TO_CREATE; i++) {
      await stakeNeuron(page, i === 0);
    }
    await expect(page.getByTestId('neuron-card')).toHaveCount(NEURONS_TO_CREATE);

    neuronIds = await getNeuronIds(page);
    expect(neuronIds).toHaveLength(NEURONS_TO_CREATE);

    await navigateTo(page, 'settings');
    await page.getByTestId('advanced-feature-toggle-advancedFollowing').click();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Test 1: Toggle advanced following and verify overview', async () => {
    await test.step('Navigate to voting page', async () => {
      await navigateTo(page, 'voting');
      await expect(page.getByRole('heading', { level: 1, name: 'Following' })).toBeVisible();
    });

    await test.step('Verify all 3 catch-all topic rows show "Not configured"', async () => {
      for (const topic of [Topic.Governance, Topic.SnsAndCommunityFund, Topic.Unspecified]) {
        const row = page.getByTestId(`topic-row-${topic}`);
        await expect(row).toBeVisible();
        await expect(row).toContainText(/not configured/i);
      }
    });

    await test.step('Verify "Manage following" button is present', async () => {
      await expect(page.getByText('Manage following')).toBeVisible();
    });
  });

  test('Test 2: Add followees via picker and verify all neurons follow', async () => {
    await test.step('Open manage following modal', async () => {
      await navigateTo(page, 'voting');
      await page.getByText('Manage following').click();
      await expect(page.getByTestId('set-followees-btn')).toBeVisible();
    });

    await test.step('Add a custom neuron as followee for Governance and All Other Topics', async () => {
      await applyPickerFlow(page, neuronIds[0], [Topic.Governance, Topic.Unspecified]);
    });

    await test.step('Verify accordion shows the followee on configured topics', async () => {
      await expect(page.getByTestId(`topic-row-${Topic.Governance}`).last()).toContainText(
        /1 set/i,
      );
      await expect(page.getByTestId(`topic-row-${Topic.Unspecified}`).last()).toContainText(
        /1 set/i,
      );
      await expect(page.getByTestId(`topic-row-${Topic.SnsAndCommunityFund}`).last()).toContainText(
        /no followees set/i,
      );
    });

    await test.step('Verify individual topics show "inherited"', async () => {
      const allOtherRow = page.getByTestId(`topic-row-${Topic.Unspecified}`).last();
      await allOtherRow.click();
      await expect(page.getByText(/inherited/i).first()).toBeVisible();
      await allOtherRow.click();
    });

    await test.step('Close modal and verify all 3 neurons have the same following', async () => {
      await page.keyboard.press('Escape');
      await verifyAllNeuronsFollowing(page, neuronIds.length, [
        { topic: Topic.Governance, text: /1 set/i },
        { topic: Topic.SnsAndCommunityFund, text: /no followees set/i },
        {
          topic: Topic.Unspecified,
          text: /1 set/i,
          individualTopics: [
            { topic: Topic.ExchangeRate, text: /inherited/i },
            { topic: Topic.NetworkEconomics, text: /inherited/i },
            { topic: Topic.SubnetManagement, text: /inherited/i },
          ],
        },
      ]);
    });
  });

  test('Test 3: Add a second followee to individual topics', async () => {
    await test.step('Navigate to voting and open manage modal', async () => {
      await navigateTo(page, 'voting');
      await page.getByText('Manage following').click();
      await expect(page.getByTestId('set-followees-btn')).toBeVisible();
    });

    await test.step('Add a different neuron to 3 individual topics', async () => {
      await applyPickerFlow(page, neuronIds[1], [
        Topic.ExchangeRate,
        Topic.NetworkEconomics,
        Topic.SubnetManagement,
      ]);
    });

    await test.step('Verify individual topics are no longer inherited', async () => {
      const allOtherRow = page.getByTestId(`topic-row-${Topic.Unspecified}`).last();
      await allOtherRow.click();

      await expect(page.getByTestId(`topic-row-${Topic.ExchangeRate}`)).toContainText(/1 set/i);
      await expect(page.getByTestId(`topic-row-${Topic.NetworkEconomics}`)).toContainText(/1 set/i);
      await expect(page.getByTestId(`topic-row-${Topic.SubnetManagement}`)).toContainText(/1 set/i);
      await expect(page.getByTestId(`topic-row-${Topic.NodeAdmin}`)).toContainText(/inherited/i);
      await expect(page.getByTestId(`topic-row-${Topic.Kyc}`)).toContainText(/inherited/i);

      await allOtherRow.click();
    });

    await test.step('Verify catch-all topics are unchanged', async () => {
      await expect(page.getByTestId(`topic-row-${Topic.Governance}`).last()).toContainText(
        /1 set/i,
      );
      await expect(page.getByTestId(`topic-row-${Topic.SnsAndCommunityFund}`).last()).toContainText(
        /no followees set/i,
      );
    });

    await test.step('Verify all 3 neurons follow the same', async () => {
      await page.keyboard.press('Escape');
      await verifyAllNeuronsFollowing(page, neuronIds.length, [
        { topic: Topic.Governance, text: /1 set/i },
        { topic: Topic.SnsAndCommunityFund, text: /no followees set/i },
        {
          topic: Topic.Unspecified,
          text: /1 set/i,
          individualTopics: [
            { topic: Topic.ExchangeRate, text: /1 set/i },
            { topic: Topic.NetworkEconomics, text: /1 set/i },
            { topic: Topic.SubnetManagement, text: /1 set/i },
            { topic: Topic.NodeAdmin, text: /inherited/i },
            { topic: Topic.Kyc, text: /inherited/i },
            { topic: Topic.NodeProviderRewards, text: /inherited/i },
          ],
        },
      ]);
    });
  });

  test('Test 4: Remove a single followee', async () => {
    await test.step('Navigate to voting and open manage modal', async () => {
      await navigateTo(page, 'voting');
      await page.getByText('Manage following').click();
      await expect(page.getByTestId('set-followees-btn')).toBeVisible();
    });

    await test.step('Remove followee from Governance', async () => {
      const govRow = page.getByTestId(`topic-row-${Topic.Governance}`).last();
      await govRow.click();
      await govRow.getByTestId('remove-followee-btn').click();
      await page.getByTestId('remove-followee-confirm-btn').click();
      await expect(page.getByTestId('remove-followee-dialog')).not.toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('Remove followee from ExchangeRate individual topic', async () => {
      const allOtherRow = page.getByTestId(`topic-row-${Topic.Unspecified}`).last();
      await allOtherRow.click();
      const exchangeRow = page.getByTestId(`topic-row-${Topic.ExchangeRate}`).last();
      await exchangeRow.click();
      await exchangeRow.getByTestId('remove-followee-btn').click();
      await page.getByTestId('remove-followee-confirm-btn').click();
      await expect(page.getByTestId('remove-followee-dialog')).not.toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('Verify Governance is now empty', async () => {
      await expect(page.getByTestId(`topic-row-${Topic.Governance}`).last()).toContainText(
        /no followees set/i,
      );
    });

    await test.step('Verify ExchangeRate falls back to inherited', async () => {
      await expect(page.getByTestId(`topic-row-${Topic.ExchangeRate}`).last()).toContainText(
        /inherited/i,
      );
    });

    await test.step('Verify other topics unchanged', async () => {
      await expect(page.getByTestId(`topic-row-${Topic.Unspecified}`).last()).toContainText(
        /1 set/i,
      );
      await expect(page.getByTestId(`topic-row-${Topic.NetworkEconomics}`).last()).toContainText(
        /1 set/i,
      );
      await expect(page.getByTestId(`topic-row-${Topic.SubnetManagement}`).last()).toContainText(
        /1 set/i,
      );
    });

    await test.step('Verify all 3 neurons follow the same', async () => {
      await page.keyboard.press('Escape');
      await verifyAllNeuronsFollowing(page, neuronIds.length, [
        { topic: Topic.Governance, text: /no followees set/i },
        { topic: Topic.SnsAndCommunityFund, text: /no followees set/i },
        {
          topic: Topic.Unspecified,
          text: /1 set/i,
          individualTopics: [
            { topic: Topic.ExchangeRate, text: /inherited/i },
            { topic: Topic.NetworkEconomics, text: /1 set/i },
            { topic: Topic.SubnetManagement, text: /1 set/i },
            { topic: Topic.NodeAdmin, text: /inherited/i },
            { topic: Topic.Kyc, text: /inherited/i },
            { topic: Topic.NodeProviderRewards, text: /inherited/i },
          ],
        },
      ]);
    });
  });

  test('Test 5: New neuron replicates consistent following', async () => {
    await test.step('Stake a 4th neuron', async () => {
      await navigateTo(page, 'neurons');
      await stakeNeuron(page, false);
      await expect(page.getByTestId('neuron-card')).toHaveCount(4);
    });

    await test.step('Verify the 4th neuron has the same following as the others', async () => {
      await verifyAllNeuronsFollowing(page, 4, [
        { topic: Topic.Governance, text: /no followees set/i },
        { topic: Topic.SnsAndCommunityFund, text: /no followees set/i },
        {
          topic: Topic.Unspecified,
          text: /1 set/i,
          individualTopics: [
            { topic: Topic.ExchangeRate, text: /inherited/i },
            { topic: Topic.NetworkEconomics, text: /1 set/i },
            { topic: Topic.SubnetManagement, text: /1 set/i },
            { topic: Topic.NodeAdmin, text: /inherited/i },
            { topic: Topic.Kyc, text: /inherited/i },
            { topic: Topic.NodeProviderRewards, text: /inherited/i },
          ],
        },
      ]);
    });
  });

  test('Test 6: Clear all following', async () => {
    await test.step('Open manage modal and clear all', async () => {
      await navigateTo(page, 'voting');
      await page.getByText('Manage following').click();
      await page.getByTestId('clear-all-following-btn').click();
      await page.getByTestId('clear-all-confirm-btn').click();
      await expect(page.getByTestId('clear-all-dialog')).not.toBeVisible({ timeout: 30000 });
    });

    await test.step('Verify all accordion rows show "No followees set"', async () => {
      for (const topic of [Topic.Governance, Topic.SnsAndCommunityFund, Topic.Unspecified]) {
        await expect(page.getByTestId(`topic-row-${topic}`).last()).toContainText(
          /no followees set/i,
        );
      }
    });

    await test.step('Verify all 4 neurons show "Set up following"', async () => {
      await page.keyboard.press('Escape');
      await verifyAllNeuronsFollowing(page, 4);
    });
  });
});
