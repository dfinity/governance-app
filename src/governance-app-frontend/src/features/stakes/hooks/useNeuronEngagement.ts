import type { ListProposalsRequest, ListProposalsResponse } from '@icp-sdk/canisters/nns';
import { ProposalRewardStatus, ProposalStatus } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';

import { calculateEngagement } from '@features/stakes/utils/calculateEngagement';

import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

const SETTLED_PROPOSALS_LIMIT = 50;

const SETTLED_PROPOSALS_REQUEST: ListProposalsRequest = {
  limit: SETTLED_PROPOSALS_LIMIT,
  beforeProposal: undefined,
  includeStatus: [ProposalStatus.Executed, ProposalStatus.Rejected],
  excludeTopic: [],
  includeRewardStatus: [ProposalRewardStatus.AcceptVotes],
  includeAllManageNeuronProposals: false,
  omitLargeFields: true,
  returnSelfDescribingAction: true,
};

export const useNeuronEngagement = () => {
  const neuronsQuery = useGovernanceNeurons();
  const { ready, canister } = useNnsGovernance();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();

  const proposalsQuery = useQueryThenUpdateCall<ListProposalsResponse>({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ENGAGEMENT, SETTLED_PROPOSALS_REQUEST, principal],
    queryFn: () =>
      canister!.listProposals({ request: SETTLED_PROPOSALS_REQUEST, certified: false }),
    updateFn: () =>
      canister!.listProposals({ request: SETTLED_PROPOSALS_REQUEST, certified: true }),
    options: { enabled: ready },
  });

  const engagement = useMemo(
    () => calculateEngagement(neuronsQuery.data?.response, proposalsQuery.data?.response.proposals),
    [neuronsQuery.data, proposalsQuery.data],
  );

  return {
    engagement,
    isLoading: neuronsQuery.isLoading || proposalsQuery.isLoading,
    isError: neuronsQuery.isError || proposalsQuery.isError,
  };
};
