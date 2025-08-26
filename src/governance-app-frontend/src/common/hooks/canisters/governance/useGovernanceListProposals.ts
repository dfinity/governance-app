import { ListProposalsRequest } from '@dfinity/nns';

import { DEFAULT_LIST_PAGINATION_LIMIT } from '@constants/extra';
import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useNnsGovernanceCanister } from './useGovernanceCanister';

export const useGovernanceListProposals = (
  request: ListProposalsRequest = {
    beforeProposal: undefined,
    limit: DEFAULT_LIST_PAGINATION_LIMIT,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [],
    includeAllManageNeuronProposals: false,
    // This flag solves the issue when the proposal payload being too large.
    // (e.g. IC0504: Error from Canister rrkah-fqaaa-aaaaa-aaaaq-cai: Canister violated contract: ic0.msg_reply_data_append: application payload size (3661753) cannot be larger than 3145728.)
    omitLargeFields: true,
  },
) => {
  const { ready, canister } = useNnsGovernanceCanister();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.LIST_PROPOSALS, request],
    queryFn: () =>
      canister!.listProposals({
        request,
        certified: false,
      }),
    updateFn: () =>
      canister!.listProposals({
        request,
        certified: true,
      }),
    options: {
      enabled: ready,
    },
  });
};
