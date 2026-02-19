import { ListProposalsRequest, ListProposalsResponse, Option } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { PAGINATION_LIMIT_PROPOSALS } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@hooks/useInfiniteQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

const DEFAULT_OPTIONS: ListProposalsRequest = {
  beforeProposal: undefined,
  limit: PAGINATION_LIMIT_PROPOSALS,
  excludeTopic: [],
  includeRewardStatus: [],
  includeStatus: [],
  includeAllManageNeuronProposals: false,
  // (e.g. IC0504: Canister payload size cannot be larger than 3145728.)
  omitLargeFields: true,
};

export const useGovernanceProposals = (overrides?: Partial<ListProposalsRequest>) => {
  const options: ListProposalsRequest = { ...DEFAULT_OPTIONS, ...overrides };
  const { identity } = useInternetIdentity();
  const { ready, canister } = useNnsGovernance();

  const principal = identity?.getPrincipal().toText();

  return useInfiniteQueryThenUpdateCall<ListProposalsResponse, Option<bigint>>({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS, options, principal],
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
      lastPage.response.proposals.length === options.limit
        ? lastPage.response.proposals.at(-1)?.id
        : undefined,
    options: {
      enabled: ready,
    },
  });
};
