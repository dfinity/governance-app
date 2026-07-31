import { ListProposalsRequest, ListProposalsResponse } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useInfiniteQueryThenUpdateCall } from '@hooks/useInfiniteQueryThenUpdateCall';
import {
  governanceProposalsQuery,
  PROPOSALS_INITIAL_PAGE_PARAM,
  proposalsNextPageParam,
  ProposalsPageParam,
  proposalsRequest,
} from '@common/queries/governance';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceProposals = (
  overrides?: Partial<ListProposalsRequest>,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const request = proposalsRequest(overrides);
  const { identity } = useInternetIdentity();
  const { ready } = useNnsGovernance();

  const principal = identity?.getPrincipal().toText();

  return useInfiniteQueryThenUpdateCall<ListProposalsResponse, ProposalsPageParam>({
    ...governanceProposalsQuery({ request, principal }),
    initialPageParam: PROPOSALS_INITIAL_PAGE_PARAM,
    getNextPageParam: proposalsNextPageParam(request),
    options: {
      enabled: ready && enabled,
    },
  });
};
