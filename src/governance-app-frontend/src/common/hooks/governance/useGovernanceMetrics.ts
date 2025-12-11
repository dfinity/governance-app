import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceMetrics = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.METRICS],
    queryFn: () => canister!.getMetrics({ certified: false }),
    updateFn: () => canister!.getMetrics({ certified: true }),
    options: {
      enabled: ready,
    },
  });
};
