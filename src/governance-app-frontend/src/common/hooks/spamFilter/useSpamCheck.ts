import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import type { CheckResult } from '@declarations/spam-filter/spam-filter.did';

import { QUERY_KEYS } from '@utils/query';

import { useSpamFilterCanister } from './useSpamFilterCanister';

export const useSpamCheck = (proposalId: bigint | undefined) => {
  const { ready, canister } = useSpamFilterCanister();

  return useQuery<CheckResult | undefined>({
    queryKey: [QUERY_KEYS.SPAM_FILTER.SPAM_CHECK, proposalId?.toString()],
    queryFn: async () => {
      const results = await canister!.spam_check([proposalId!]);
      const entry = results[0];
      if (isNullish(entry) || entry[1].length === 0) return undefined;
      return entry[1][0];
    },
    enabled: ready && !isNullish(proposalId),
  });
};
