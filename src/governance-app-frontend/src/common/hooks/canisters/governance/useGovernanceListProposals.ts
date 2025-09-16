import { ListProposalsRequest, ListProposalsResponse, Option } from '@dfinity/nns';

import { PAGINATION_LIMIT } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@queries/useInfiniteQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useNnsGovernanceCanister } from './useGovernanceCanister';

export const useGovernanceGetProposals = (
  options: ListProposalsRequest = {
    beforeProposal: undefined,
    limit: PAGINATION_LIMIT,
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

  return useInfiniteQueryThenUpdateCall<ListProposalsResponse, Option<bigint>>({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS, options],
    queryFn: (context) =>
      canister!.listProposals({
        request: { ...options, beforeProposal: context.pageParam },
        certified: false,
      }),
    updateFn: (context) =>
      canister!.listProposals({
        request: { ...options, beforeProposal: context.pageParam },
        certified: true,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.response.proposals.length === PAGINATION_LIMIT
        ? lastPage.response.proposals.at(-1)?.id
        : undefined,
    options: {
      enabled: ready,
    },
  });
};
