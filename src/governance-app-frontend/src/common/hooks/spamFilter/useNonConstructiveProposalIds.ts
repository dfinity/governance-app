import { useQuery } from '@tanstack/react-query';

import type { NonConstructiveProposalIds } from '@declarations/spam-filter/spam-filter.did';

import { QUERY_KEYS } from '@utils/query';

import { useSpamFilterCanister } from './useSpamFilterCanister';

export const useNonConstructiveProposalIds = () => {
  const { ready, canister } = useSpamFilterCanister();

  return useQuery<NonConstructiveProposalIds>({
    queryKey: [QUERY_KEYS.SPAM_FILTER.NON_CONSTRUCTIVE_PROPOSAL_IDS],
    queryFn: () => canister!.get_non_constructive_proposal_ids(),
    enabled: ready,
  });
};
