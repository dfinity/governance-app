import '@/i18n/config';

import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorNotification, successNotification } from '@utils/notification';
import { mockNeuron } from '@fixtures/neuron';

import { ConfirmFollowingAllButton } from './ConfirmFollowingAllButton';

// ─── Module mocks ────────────────────────────────────────────────

const { USER, refreshVotingPower } = vi.hoisted(() => ({
  USER: 'user-principal',
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

vi.mock('@utils/notification', () => ({
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const controlledNeuron = (neuronId: bigint) =>
  mockNeuron({ neuronId, fullNeuron: { id: neuronId, controller: USER } });

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
    renderButton([controlledNeuron(1n), hotkeyNeuron(2n), controlledNeuron(3n)]);

    await user.click(confirmAllButton()!);

    expect(refreshVotingPower).toHaveBeenCalledTimes(2);
    expect(refreshVotingPower).toHaveBeenCalledWith({ neuronId: 1n });
    expect(refreshVotingPower).toHaveBeenCalledWith({ neuronId: 3n });
    expect(successNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Following confirmed for all your neurons.',
    });
    expect(errorNotification).not.toHaveBeenCalled();
  });

  it('renders nothing when the user controls no neuron', () => {
    renderButton([hotkeyNeuron(1n)]);

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
