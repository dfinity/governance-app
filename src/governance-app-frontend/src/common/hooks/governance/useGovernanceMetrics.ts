import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { governanceMetricsQuery } from '@common/queries/governance';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceMetrics = () => {
  const { ready } = useNnsGovernance();

  return useQueryThenUpdateCall({
    ...governanceMetricsQuery(),
    options: {
      enabled: ready,
    },
  });
};
