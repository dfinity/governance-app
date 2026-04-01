import type { ActorSubclass } from '@icp-sdk/core/agent';
import { isNullish } from '@dfinity/utils';

import type { _SERVICE, CheckResult } from '@declarations/spam-filter/spam-filter.did';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useSpamFilterCanister } from './useSpamFilterCanister';

const fetchSpamCheck = async (
  actor: ActorSubclass<_SERVICE>,
  proposalId: bigint,
): Promise<CheckResult | undefined> => {
  const results = await actor.spam_check([proposalId]);
  const entry = results[0];
  if (isNullish(entry) || entry[1].length === 0) return undefined;
  return entry[1][0];
};

export const useSpamCheck = (proposalId: bigint | undefined) => {
  const { ready, canister } = useSpamFilterCanister();

  return useQueryThenUpdateCall<CheckResult | undefined>({
    queryKey: [QUERY_KEYS.SPAM_FILTER.SPAM_CHECK, proposalId?.toString()],
    queryFn: () => fetchSpamCheck(canister!.service, proposalId!),
    updateFn: () => fetchSpamCheck(canister!.certifiedService, proposalId!),
    options: {
      enabled: ready && !isNullish(proposalId),
    },
  });
};
