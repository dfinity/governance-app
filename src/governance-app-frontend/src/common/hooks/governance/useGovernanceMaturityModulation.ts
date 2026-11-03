import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceMaturityModulation = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.MATURITY_MODULATION],
    queryFn: () => canister!.getMaturityModulation({ certified: false }),
    updateFn: () => canister!.getMaturityModulation({ certified: true }),
    options: {
      enabled: ready,
    },
  });
};
