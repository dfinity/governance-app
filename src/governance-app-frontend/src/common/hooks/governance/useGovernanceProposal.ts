import { ListProposalsRequest } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

/**
 * Use the `list_proposals` API instead of `proposal_info` to take advantage of `omitLargeFields`.
 * The payload rendering will rely on new backend fields (not yet implemented).
 */
export const useGovernanceProposal = ({ proposalId }: { proposalId: bigint | undefined }) => {
  const { identity } = useInternetIdentity();
  const { ready, canister } = useNnsGovernance();

  const request: ListProposalsRequest = {
    beforeProposal: proposalId && proposalId + 1n,
    limit: 1,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [],
    includeAllManageNeuronProposals: false,
    omitLargeFields: true,
  };

  const principal = identity?.getPrincipal().toText();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposalId, request, principal],
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
