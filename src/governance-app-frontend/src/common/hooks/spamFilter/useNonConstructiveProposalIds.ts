import type { NonConstructiveProposalIds } from '@declarations/spam-filter/spam-filter.did';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useSpamFilterCanister } from './useSpamFilterCanister';

export const useNonConstructiveProposalIds = () => {
  const { ready, canister } = useSpamFilterCanister();

  return useQueryThenUpdateCall<NonConstructiveProposalIds>({
    queryKey: [QUERY_KEYS.SPAM_FILTER.NON_CONSTRUCTIVE_PROPOSAL_IDS],
    queryFn: () => canister!.service.get_non_constructive_proposal_ids(),
    updateFn: () => canister!.certifiedService.get_non_constructive_proposal_ids(),
    options: {
      enabled: ready,
    },
  });
};
