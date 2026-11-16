import { ListProposalsRequest, ProposalInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

/**
 * Use the `list_proposals` API instead of `proposal_info` to take advantage of `omitLargeFields`.
 * The payload rendering will rely on new backend fields (not yet implemented).
 */
export const useGovernanceProposal = (props?: { proposalId: bigint }) => {
  const { identity } = useInternetIdentity();
  const { ready, canister, authenticated } = useNnsGovernance();

  const { proposalId } = props ?? {};

  const request: ListProposalsRequest = {
    beforeProposal: proposalId && proposalId + 1n,
    limit: 1,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [],
    includeAllManageNeuronProposals: false,
    omitLargeFields: true,
    returnSelfDescribingAction: true,
  };

  const principal = identity?.getPrincipal().toText();

  // `beforeProposal: proposalId + 1n` falls back to a neighboring proposal when the requested ID doesn't exist; drop those.
  const matchesRequestedId = (proposal: ProposalInfo | undefined) =>
    isNullish(proposalId) || proposal?.id === proposalId ? proposal : undefined;

  return useQueryThenUpdateCall({
    // The ballots depend on the caller. At a login, the authenticated agent starts after the
    // identity, so the key also names the agent.
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposalId, request, principal, authenticated],
    queryFn: async () => {
      const res = await canister!.listProposals({ request, certified: false });
      return matchesRequestedId(res.proposals[0]);
    },
    updateFn: async () => {
      const res = await canister!.listProposals({ request, certified: true });
      return matchesRequestedId(res.proposals[0]);
    },
    options: {
      enabled: ready,
      // A login on the proposal page changes the principal only: keep the proposal on screen
      // while the ballots of the new caller load.
      placeholderData: (previous, previousQuery) =>
        nonNullish(proposalId) && previousQuery?.queryKey[1] === proposalId.toString()
          ? previous
          : undefined,
    },
  });
};
