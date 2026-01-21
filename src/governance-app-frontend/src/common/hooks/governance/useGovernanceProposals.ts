import { ListProposalsRequest, ListProposalsResponse, Option } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { PAGINATION_LIMIT_PROPOSALS } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@hooks/useInfiniteQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceProposals = (options?: Partial<ListProposalsRequest>) => {
  const args: ListProposalsRequest = {
    beforeProposal: undefined,
    limit: PAGINATION_LIMIT_PROPOSALS,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [],
    includeAllManageNeuronProposals: false,
    // This flag solves the issue when the proposal payload being too large.
    // (e.g. IC0504: Error from Canister rrkah-fqaaa-aaaaa-aaaaq-cai: Canister violated contract: ic0.msg_reply_data_append: application payload size (3661753) cannot be larger than 3145728.)
    omitLargeFields: true,
  },
) => {
  const { identity } = useInternetIdentity();
  const { ready, canister } = useNnsGovernance();

  const principal = identity?.getPrincipal().toText();

  return useInfiniteQueryThenUpdateCall<ListProposalsResponse, Option<bigint>>({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS, options, principal],
    queryFn: (context) =>
      canister!.listProposals({
        request: { ...args, beforeProposal: context.pageParam },
        certified: false,
      }),
    updateFn: (context) =>
      canister!.listProposals({
        request: { ...args, beforeProposal: context.pageParam },
        certified: true,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.response.proposals.length === PAGINATION_LIMIT_PROPOSALS
        ? lastPage.response.proposals.at(-1)?.id
        : undefined,
    options: {
      enabled: ready,
    },
  });
};
