import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceEconomics = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ECONOMICS],
    queryFn: () => canister!.getNetworkEconomicsParameters({ certified: false }),
    updateFn: () => canister!.getNetworkEconomicsParameters({ certified: true }),
    options: {
      enabled: ready,
    },
  });
};
