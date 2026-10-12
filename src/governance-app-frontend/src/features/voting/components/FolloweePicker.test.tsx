import '@/i18n/config';

import { Topic } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_FOLLOWEES_PER_TOPIC } from '../utils/topicFollowing';
import { FolloweePicker } from './FolloweePicker';

// ─── Module mocks ────────────────────────────────────────────────

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { setFollowing: vi.fn() } }),
  useGovernanceNeurons: () => ({ data: { certified: true, response: [] } }),
}));

vi.mock('@hooks/governance/useGovernanceKnownNeurons', () => ({
  useGovernanceKnownNeurons: () => ({ data: { response: [] }, isLoading: false }),
}));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

// ─── Helpers ─────────────────────────────────────────────────────

const ids = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => BigInt(i + 1 + offset));

const renderPicker = (currentFolloweesMap = new Map<Topic, bigint[]>()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FolloweePicker
        open
        onOpenChange={() => {}}
        userNeurons={[]}
        currentFolloweesMap={currentFolloweesMap}
      />
    </QueryClientProvider>,
  );

const addCustomNeurons = async (user: ReturnType<typeof userEvent.setup>, neuronIds: bigint[]) => {
  for (const id of neuronIds) {
    await user.type(screen.getByTestId('picker-custom-id-input'), id.toString());
    await user.click(screen.getByTestId('picker-custom-id-add'));
  }
};

describe('FolloweePicker', () => {
  it('blocks Next above the followee limit', async () => {
    const user = userEvent.setup();
    renderPicker();

    await addCustomNeurons(user, ids(MAX_FOLLOWEES_PER_TOPIC + 1));

    expect(screen.getByTestId('picker-too-many-neurons')).toBeTruthy();
    expect(screen.getByTestId('picker-next-btn')).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('checkbox', { name: String(MAX_FOLLOWEES_PER_TOPIC + 1) }));

    expect(screen.queryByTestId('picker-too-many-neurons')).toBeNull();
    expect(screen.getByTestId('picker-next-btn')).toHaveProperty('disabled', false);
  });

  it('counts the existing followees of a topic together with the new ones', async () => {
    const user = userEvent.setup();
    renderPicker(new Map([[Topic.Governance, ids(10)]]));

    await addCustomNeurons(user, ids(6, 100));
    await user.click(screen.getByTestId('picker-next-btn'));

    await user.click(screen.getByTestId(`picker-topic-${Topic.SnsAndCommunityFund}`));
    expect(screen.queryByTestId('picker-followee-limit')).toBeNull();
    expect(screen.getByTestId('picker-apply-btn')).toHaveProperty('disabled', false);

    await user.click(screen.getByTestId(`picker-topic-${Topic.Governance}`));
    expect(screen.getByTestId('picker-followee-limit').textContent).toContain('Governance');
    expect(screen.getByTestId('picker-followee-limit').textContent).not.toContain('SNS');
    expect(screen.getByTestId('picker-apply-btn')).toHaveProperty('disabled', true);
  });
});
