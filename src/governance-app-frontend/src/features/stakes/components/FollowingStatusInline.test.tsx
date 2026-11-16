import '@/i18n/config';

import type { Neuron } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SECONDS_IN_DAY } from '@constants/extra';
import { nowInSeconds, secondsToDate } from '@utils/date';
import { errorNotification, successNotification } from '@utils/notification';
import { mockNeuron } from '@fixtures/neuron';

import { FollowingStatusInline } from './FollowingStatusInline';

// ─── Module mocks ────────────────────────────────────────────────

const { USER, ECONOMICS, refreshVotingPower } = vi.hoisted(() => ({
  USER: 'user-principal',
  // Protocol defaults: decay starts 6 months after the last refresh, and
  // following is cleared 1 month later.
  ECONOMICS: {
    startReducingVotingPowerAfterSeconds: BigInt(6 * 30 * 86_400),
    clearFollowingAfterSeconds: BigInt(30 * 86_400),
  },
  refreshVotingPower: vi.fn(),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => USER }) },
  }),
}));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { refreshVotingPower } }),
}));

vi.mock('@hooks/governance/useGovernanceEconomics', () => ({
  useGovernanceEconomics: () => ({
    data: { response: { votingPowerEconomics: ECONOMICS } },
    isLoading: false,
  }),
}));

vi.mock('@utils/notification', () => ({
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const daysAgo = (days: number) => BigInt(nowInSeconds() - days * SECONDS_IN_DAY);

const renderInline = ({
  refreshedSeconds,
  fullNeuron = { controller: USER },
}: {
  refreshedSeconds: bigint;
  fullNeuron?: Partial<Neuron>;
}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FollowingStatusInline
        neuron={mockNeuron({ votingPowerRefreshedTimestampSeconds: refreshedSeconds, fullNeuron })}
      />
    </QueryClientProvider>,
  );

const confirmButton = () => screen.queryByTestId('confirm-following-inline-btn');

describe('FollowingStatusInline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshVotingPower.mockResolvedValue(undefined);
  });

  it('shows the confirm button in the ok state and the last confirmed date in the tooltip', () => {
    const refreshedSeconds = daysAgo(10);
    renderInline({ refreshedSeconds });

    expect(screen.getByTestId('neuron-following-status-inline-ok')).toBeTruthy();
    expect(
      screen.getByText(`Last confirmed ${secondsToDate(Number(refreshedSeconds))}.`, {
        exact: false,
      }),
    ).toBeTruthy();
    expect(confirmButton()?.textContent).toBe('Confirm now');
  });

  it.each([
    { role: 'controller', fullNeuron: { controller: USER } },
    { role: 'hotkey', fullNeuron: { controller: 'other-principal', hotKeys: [USER] } },
  ])('confirms following for a $role with one success toast', async ({ fullNeuron }) => {
    const user = userEvent.setup();
    renderInline({ refreshedSeconds: daysAgo(10), fullNeuron });

    expect(confirmButton()).toHaveProperty('disabled', false);
    await user.click(confirmButton()!);

    expect(refreshVotingPower).toHaveBeenCalledExactlyOnceWith({ neuronId: 1n });
    expect(successNotification).toHaveBeenCalledOnce();
    expect(errorNotification).not.toHaveBeenCalled();
  });

  it('shows an error toast when the call fails', async () => {
    refreshVotingPower.mockRejectedValue(new Error('Canister is down'));
    const user = userEvent.setup();
    renderInline({ refreshedSeconds: daysAgo(10) });

    await user.click(confirmButton()!);

    expect(errorNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Canister is down',
    });
    expect(successNotification).not.toHaveBeenCalled();
  });

  it('does not show the button for a user who is not a controller or a hotkey', () => {
    renderInline({
      refreshedSeconds: daysAgo(10),
      fullNeuron: { controller: 'other-principal', hotKeys: [] },
    });

    expect(screen.getByTestId('neuron-following-status-inline-ok')).toBeTruthy();
    expect(confirmButton()).toBeNull();
  });

  it('does not show the button or the date outside the ok state', () => {
    // 5 months and 10 days ago: inside the 30-day warning window.
    renderInline({ refreshedSeconds: daysAgo(160) });

    expect(screen.getByTestId('neuron-following-status-inline-warning')).toBeTruthy();
    expect(confirmButton()).toBeNull();
    expect(screen.queryByText('Last confirmed', { exact: false })).toBeNull();
  });
});
