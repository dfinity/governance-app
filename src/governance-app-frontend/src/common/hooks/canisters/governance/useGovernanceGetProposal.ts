import { ListProposalsRequest } from '@dfinity/nns';

import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useNnsGovernanceCanister } from './useGovernanceCanister';

/**
 * Use the `list_proposals` API instead of `proposal_info` to take advantage of `omitLargeFields`.
 * The payload rendering will rely on new backend fields (not yet implemented).
 */
export const useGovernanceGetProposal = ({ proposalId }: { proposalId: bigint | undefined }) => {
  const { ready, canister, authenticated } = useNnsGovernanceCanister();

  const request: ListProposalsRequest = {
    beforeProposal: proposalId && proposalId + 1n,
    limit: 1,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [],
    includeAllManageNeuronProposals: false,
    omitLargeFields: true,
  };

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, request, authenticated],
    queryFn: async () => {
      const res = await canister!.listProposals({ request, certified: false });
      return res.proposals[0];
    },
    updateFn: async () => {
      const res = await canister!.listProposals({ request, certified: true });
      return res.proposals[0];
    },
    options: {
      enabled: ready && !!proposalId,
    },
  });
};
