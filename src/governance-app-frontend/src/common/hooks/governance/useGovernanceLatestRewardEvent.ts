import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceLatestRewardEvent = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.LATEST_REWARD_EVENT],
    queryFn: () => canister!.getLatestRewardEvent(false),
    updateFn: () => canister!.getLatestRewardEvent(true),
    options: {
      enabled: ready,
    },
  });
};
