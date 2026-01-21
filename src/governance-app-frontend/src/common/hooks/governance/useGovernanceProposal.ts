import { ListProposalsRequest } from '@icp-sdk/canisters/nns';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

/**
 * Use the `list_proposals` API instead of `proposal_info` to take advantage of `omitLargeFields`.
 * The payload rendering will rely on new backend fields (not yet implemented).
 */
export const useGovernanceProposal = (props?: { proposalId?: bigint }) => {
  const { proposalId } = props ?? {};
  const { ready, canister, authenticated } = useNnsGovernance();

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
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposalId, request, authenticated],
    queryFn: async () => {
      const res = await canister!.listProposals({ request, certified: false });
      return res.proposals[0];
    },
    updateFn: async () => {
      const res = await canister!.listProposals({ request, certified: true });
      return res.proposals[0];
    },
    options: {
      enabled: ready,
    },
  });
};
