import type { ActorSubclass } from '@icp-sdk/core/agent';

import type {
  _SERVICE,
  NonConstructiveProposalIds,
} from '@declarations/spam-filter/spam-filter.did';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useSpamFilterCanister } from './useSpamFilterCanister';

const fetchNonConstructiveIds = (
  actor: ActorSubclass<_SERVICE>,
): Promise<NonConstructiveProposalIds> => actor.get_non_constructive_proposal_ids();

export const useNonConstructiveProposalIds = () => {
  const { ready, canister } = useSpamFilterCanister();

  return useQueryThenUpdateCall<NonConstructiveProposalIds>({
    queryKey: [QUERY_KEYS.SPAM_FILTER.NON_CONSTRUCTIVE_PROPOSAL_IDS],
    queryFn: () => fetchNonConstructiveIds(canister!.service),
    updateFn: () => fetchNonConstructiveIds(canister!.certifiedService),
    options: {
      enabled: ready,
    },
  });
};
