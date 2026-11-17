import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

// Governance updates the value once a day, at midnight UTC.
const MATURITY_MODULATION_REFRESH_MS = 60 * 60 * 1000;

export const useGovernanceMaturityModulation = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.MATURITY_MODULATION],
    queryFn: () => canister!.getMaturityModulation({ certified: false }),
    updateFn: () => canister!.getMaturityModulation({ certified: true }),
    options: {
      enabled: ready,
      refetchInterval: MATURITY_MODULATION_REFRESH_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  });
};
