import type {
  ListProposalsRequest,
  ListProposalsResponse,
  NeuronInfo,
} from '@icp-sdk/canisters/nns';
import { ProposalRewardStatus, ProposalStatus } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';

import { calculateEngagement } from '@features/stakes/utils/calculateEngagement';

import { useNnsGovernance } from '@hooks/governance';
import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

const PROPOSALS_LIMIT = 50;

const DECIDED_PROPOSALS_REQUEST: ListProposalsRequest = {
  limit: PROPOSALS_LIMIT,
  beforeProposal: undefined,
  includeStatus: [ProposalStatus.Executed, ProposalStatus.Rejected],
  excludeTopic: [],
  includeRewardStatus: [ProposalRewardStatus.AcceptVotes],
  includeAllManageNeuronProposals: false,
  omitLargeFields: true,
  returnSelfDescribingAction: true,
};

export const useNeuronEngagement = (neurons: NeuronInfo[]) => {
  const { ready, canister } = useNnsGovernance();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();

  const proposalsQuery = useQueryThenUpdateCall<ListProposalsResponse>({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ENGAGEMENT, DECIDED_PROPOSALS_REQUEST, principal],
    queryFn: () =>
      canister!.listProposals({ request: DECIDED_PROPOSALS_REQUEST, certified: false }),
    updateFn: () =>
      canister!.listProposals({ request: DECIDED_PROPOSALS_REQUEST, certified: true }),
    options: { enabled: ready },
  });

  const engagement = useMemo(
    () => calculateEngagement(neurons, proposalsQuery.data?.response.proposals),
    [neurons, proposalsQuery.data],
  );

  return {
    engagement,
    isLoading: proposalsQuery.isLoading,
    isError: proposalsQuery.isError,
  };
};
