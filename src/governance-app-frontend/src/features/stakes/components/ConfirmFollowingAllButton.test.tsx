import '@/i18n/config';

import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SECONDS_IN_DAY } from '@constants/extra';
import { nowInSeconds } from '@utils/date';
import { errorNotification, successNotification } from '@utils/notification';
import { mockNeuron } from '@fixtures/neuron';

import { ConfirmFollowingAllButton } from './ConfirmFollowingAllButton';

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

vi.mock('ic-use-internet-identity', () => ({
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

const controlledNeuron = (neuronId: bigint, refreshedDaysAgo = 10) =>
  mockNeuron({
    neuronId,
    votingPowerRefreshedTimestampSeconds: daysAgo(refreshedDaysAgo),
    fullNeuron: { id: neuronId, controller: USER },
  });

const hotkeyNeuron = (neuronId: bigint) =>
  mockNeuron({
    neuronId,
    fullNeuron: { id: neuronId, controller: 'other-principal', hotKeys: [USER] },
  });

const renderButton = (neurons: NeuronInfo[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmFollowingAllButton neurons={neurons} />
    </QueryClientProvider>,
  );

const confirmAllButton = () => screen.queryByTestId('confirm-following-all-btn');

describe('ConfirmFollowingAllButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshVotingPower.mockResolvedValue(undefined);
  });

  it('confirms following for each controlled neuron with one success toast', async () => {
    const user = userEvent.setup();
    renderButton([
      controlledNeuron(1n),
      hotkeyNeuron(2n),
      // Decaying: 6 months and 10 days ago.
      controlledNeuron(3n, 190),
      // Expired: 8 months ago.
      controlledNeuron(4n, 240),
    ]);

    await user.click(confirmAllButton()!);

    expect(refreshVotingPower).toHaveBeenCalledTimes(2);
    expect(refreshVotingPower).toHaveBeenCalledWith({ neuronId: 1n });
    expect(refreshVotingPower).toHaveBeenCalledWith({ neuronId: 3n });
    expect(successNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Following confirmed for all your neurons.',
    });
    expect(errorNotification).not.toHaveBeenCalled();
  });

  it('renders nothing when the user controls no neuron that is not expired', () => {
    renderButton([hotkeyNeuron(1n), controlledNeuron(2n, 240)]);

    expect(confirmAllButton()).toBeNull();
  });

  it('shows one error toast with the count when some calls fail', async () => {
    refreshVotingPower.mockImplementation(({ neuronId }: { neuronId: bigint }) =>
      neuronId === 2n ? Promise.reject(new Error('Canister is down')) : Promise.resolve(),
    );
    const user = userEvent.setup();
    renderButton([controlledNeuron(1n), controlledNeuron(2n), controlledNeuron(3n)]);

    await user.click(confirmAllButton()!);

    expect(refreshVotingPower).toHaveBeenCalledTimes(3);
    expect(errorNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Failed to confirm following for 1 of 3 neurons. Please try again.',
    });
    expect(successNotification).not.toHaveBeenCalled();
  });

  it('shows the error of the first call when all calls fail', async () => {
    refreshVotingPower.mockRejectedValue(new Error('Canister is down'));
    const user = userEvent.setup();
    renderButton([controlledNeuron(1n), controlledNeuron(2n)]);

    await user.click(confirmAllButton()!);

    expect(errorNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Canister is down',
    });
    expect(successNotification).not.toHaveBeenCalled();
  });
});
