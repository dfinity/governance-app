import '@/i18n/config';

import type { ProposalInfo } from '@icp-sdk/canisters/nns';
import { ProposalRewardStatus, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@utils/query';
import { mockNeuron } from '@fixtures/neuron';

import { useVoting } from './useVoting';

const { registerVote } = vi.hoisted(() => ({ registerVote: vi.fn() }));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { registerVote }, ready: true, authenticated: true }),
  useGovernanceNeurons: () => ({ data: { response: [mockNeuron({ neuronId: 1n })] } }),
}));

vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

const proposal: ProposalInfo = {
  id: 42n,
  ballots: [{ neuronId: 1n, vote: Vote.Unspecified, votingPower: 100_000_000n }],
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
};

describe('useVoting', () => {
  it('refreshes the participation rate after a vote', async () => {
    registerVote.mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVoting(proposal), { wrapper });
    act(() => result.current.vote(Vote.Yes));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ENGAGEMENT],
      }),
    );
    expect(registerVote).toHaveBeenCalledWith({ proposalId: 42n, vote: Vote.Yes, neuronId: 1n });
  });
});
