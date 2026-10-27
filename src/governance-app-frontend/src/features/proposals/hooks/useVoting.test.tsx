import '@/i18n/config';

import type { Ballot, NeuronInfo, ProposalInfo } from '@icp-sdk/canisters/nns';
import { ProposalRewardStatus, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelPendingDeviceAction, usePendingDeviceAction } from '@hooks/useDeviceAction';
import { QUERY_KEYS } from '@utils/query';
import { mockNeuron } from '@fixtures/neuron';

import { useVoting } from './useVoting';

const mocks = vi.hoisted(() => ({
  registerVote: vi.fn(),
  deviceRegisterVote: vi.fn(),
  neurons: vi.fn(() => [] as NeuronInfo[]),
  ledgerPrincipals: vi.fn(() => [] as string[]),
  getNnsGovernanceCanister: vi.fn(),
  runOnDevice: vi.fn(),
  toastPromise: vi.fn(),
}));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({
    canister: { registerVote: mocks.registerVote },
    ready: true,
    authenticated: true,
  }),
  useGovernanceNeurons: () => ({ data: { response: mocks.neurons() } }),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => II_PRINCIPAL }) },
  }),
}));

vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useLedgerSignerPrincipals: () => mocks.ledgerPrincipals(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));

vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
  getDeviceSessionGeneration: () => 0,
}));

vi.mock('sonner', () => ({ toast: { promise: mocks.toastPromise } }));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

const II_PRINCIPAL = 'ii-principal';
const DEVICE = 'device-principal';

const ballot = (neuronId: bigint): Ballot => ({
  neuronId,
  vote: Vote.Unspecified,
  votingPower: 100_000_000n,
});

const proposalWith = (neuronIds: bigint[]): ProposalInfo => ({
  id: 42n,
  ballots: neuronIds.map(ballot),
  rejectCost: 0n,
  proposalTimestampSeconds: 0n,
  rewardEventRound: 0n,
  failedTimestampSeconds: 0n,
  decidedTimestampSeconds: 0n,
  deadlineTimestampSeconds: undefined,
  latestTally: undefined,
  proposal: undefined,
  proposer: undefined,
  executedTimestampSeconds: 0n,
  topic: Topic.Governance,
  status: ProposalStatus.Executed,
  rewardStatus: ProposalRewardStatus.AcceptVotes,
  totalPotentialVotingPower: undefined,
});

const sessionNeuron = (neuronId: bigint) =>
  mockNeuron({ neuronId, fullNeuron: { controller: II_PRINCIPAL } });
const hotkeyDeviceNeuron = (neuronId: bigint) =>
  mockNeuron({ neuronId, fullNeuron: { controller: DEVICE, hotKeys: [II_PRINCIPAL] } });
const deviceNeuron = (neuronId: bigint) =>
  mockNeuron({ neuronId, fullNeuron: { controller: DEVICE, hotKeys: [] } });

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const renderVoting = (proposal: ProposalInfo) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    ...renderHook(() => ({ voting: useVoting(proposal), pending: usePendingDeviceAction() }), {
      wrapper,
    }),
    invalidateQueries,
  };
};

describe('useVoting', () => {
  beforeEach(() => {
    mocks.registerVote.mockReset().mockResolvedValue(undefined);
    mocks.deviceRegisterVote.mockReset().mockResolvedValue(undefined);
    mocks.neurons.mockReturnValue([sessionNeuron(1n)]);
    mocks.ledgerPrincipals.mockReturnValue([]);
    mocks.getNnsGovernanceCanister
      .mockReset()
      .mockResolvedValue({ registerVote: mocks.deviceRegisterVote });
    mocks.runOnDevice.mockReset().mockImplementation((_principal, call) => call());
    mocks.toastPromise.mockReset();
  });

  it('refreshes the participation rate after a vote', async () => {
    const proposal = proposalWith([1n]);
    const { result, invalidateQueries } = renderVoting(proposal);

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ENGAGEMENT],
      }),
    );
    expect(mocks.registerVote).toHaveBeenCalledWith({
      proposalId: 42n,
      vote: Vote.Yes,
      neuronId: 1n,
    });
  });

  it('votes with the session for the neurons it holds as hotkey, even on a device neuron', async () => {
    mocks.neurons.mockReturnValue([sessionNeuron(1n), hotkeyDeviceNeuron(2n)]);
    mocks.ledgerPrincipals.mockReturnValue([DEVICE]);
    const { result } = renderVoting(proposalWith([1n, 2n]));

    act(() => result.current.voting.vote(Vote.No));

    await waitFor(() => expect(mocks.registerVote).toHaveBeenCalledTimes(2));
    expect(mocks.registerVote).toHaveBeenCalledWith({
      proposalId: 42n,
      vote: Vote.No,
      neuronId: 2n,
    });
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();
  });

  it('votes with the device, after the session votes, for a device neuron without hotkey', async () => {
    mocks.neurons.mockReturnValue([sessionNeuron(1n), deviceNeuron(2n)]);
    mocks.ledgerPrincipals.mockReturnValue([DEVICE]);
    const order: string[] = [];
    mocks.registerVote.mockImplementation(async () => {
      order.push('session');
    });
    mocks.deviceRegisterVote.mockImplementation(async () => {
      order.push('device');
    });
    const { result, invalidateQueries } = renderVoting(proposalWith([1n, 2n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
      }),
    );
    expect(order).toEqual(['session', 'device']);
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE, expect.any(Function));
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({
      signer: { kind: 'ledger', principal: DEVICE },
    });
    expect(mocks.deviceRegisterVote).toHaveBeenCalledWith({
      proposalId: 42n,
      vote: Vote.Yes,
      neuronId: 2n,
    });
    expect(mocks.registerVote).toHaveBeenCalledTimes(1);
  });

  it('skips the device when the browser cannot use it', async () => {
    mocks.neurons.mockReturnValue([deviceNeuron(2n)]);
    mocks.ledgerPrincipals.mockReturnValue([]);
    const { result } = renderVoting(proposalWith([2n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() => expect(mocks.registerVote).toHaveBeenCalledTimes(1));
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();
  });

  it('votes with the device one neuron at a time behind the approval dialog', async () => {
    mocks.neurons.mockReturnValue([deviceNeuron(2n), deviceNeuron(3n)]);
    mocks.ledgerPrincipals.mockReturnValue([DEVICE]);
    const first = deferred<void>();
    mocks.deviceRegisterVote.mockImplementationOnce(() => first.promise);
    const { result } = renderVoting(proposalWith([2n, 3n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() => expect(mocks.deviceRegisterVote).toHaveBeenCalledTimes(1));
    expect(result.current.pending).not.toBeNull();
    expect(mocks.deviceRegisterVote).toHaveBeenCalledWith(
      expect.objectContaining({ neuronId: 2n }),
    );

    await act(async () => {
      first.resolve();
      await first.promise;
    });

    await waitFor(() => expect(mocks.deviceRegisterVote).toHaveBeenCalledTimes(2));
    expect(mocks.deviceRegisterVote).toHaveBeenLastCalledWith(
      expect.objectContaining({ neuronId: 3n }),
    );
    await waitFor(() => expect(result.current.pending).toBeNull());
  });

  it('stops the device votes on a cancel and keeps the session votes', async () => {
    mocks.neurons.mockReturnValue([sessionNeuron(1n), deviceNeuron(2n), deviceNeuron(3n)]);
    mocks.ledgerPrincipals.mockReturnValue([DEVICE]);
    const first = deferred<void>();
    mocks.deviceRegisterVote.mockImplementationOnce(() => first.promise);
    const { result, invalidateQueries } = renderVoting(proposalWith([1n, 2n, 3n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() => expect(mocks.deviceRegisterVote).toHaveBeenCalledTimes(1));
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();

    // The vote stays pending until the device answers the request it still shows.
    expect(result.current.voting.isVoting).toBe(true);
    await act(async () => {
      first.resolve();
      await first.promise;
    });

    await waitFor(() => expect(result.current.voting.isVoting).toBe(false));
    expect(mocks.registerVote).toHaveBeenCalledTimes(1);
    expect(mocks.deviceRegisterVote).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
    });
    const [, texts] = mocks.toastPromise.mock.calls[0];
    expect(texts.error(new Error('other'))).toBe('Failed to vote on proposal 42');
    await expect(mocks.toastPromise.mock.calls[0][0]).rejects.toThrow(
      'The device action was cancelled.',
    );
  });

  it('waits for every session vote before it reports a failed one', async () => {
    mocks.neurons.mockReturnValue([sessionNeuron(1n), sessionNeuron(2n)]);
    const slow = deferred<void>();
    mocks.registerVote
      .mockRejectedValueOnce(new Error('rejected'))
      .mockImplementationOnce(() => slow.promise);
    const { result, invalidateQueries } = renderVoting(proposalWith([1n, 2n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() => expect(mocks.registerVote).toHaveBeenCalledTimes(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.voting.isVoting).toBe(true);
    expect(invalidateQueries).not.toHaveBeenCalled();

    await act(async () => {
      slow.resolve();
      await slow.promise;
    });
    await waitFor(() => expect(result.current.voting.isVoting).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
    });
    await expect(mocks.toastPromise.mock.calls[0][0]).rejects.toThrow('rejected');
  });

  it('refreshes the votes already cast when a device vote fails', async () => {
    mocks.neurons.mockReturnValue([sessionNeuron(1n), deviceNeuron(2n), deviceNeuron(3n)]);
    mocks.ledgerPrincipals.mockReturnValue([DEVICE]);
    mocks.deviceRegisterVote.mockRejectedValueOnce(new Error('rejected on the device'));
    const { result, invalidateQueries } = renderVoting(proposalWith([1n, 2n, 3n]));

    act(() => result.current.voting.vote(Vote.Yes));

    await waitFor(() => expect(result.current.voting.isVoting).toBe(false));
    expect(mocks.registerVote).toHaveBeenCalledTimes(1);
    expect(mocks.deviceRegisterVote).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
    });
    await expect(mocks.toastPromise.mock.calls[0][0]).rejects.toThrow('rejected on the device');
  });
});
