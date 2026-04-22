import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type IncreaseDelayParams = {
  neuronId: bigint;
  dissolveDelaySeconds: number;
  currentDissolveDelaySeconds: number;
};

/**
 * Hook to increase dissolve delay on an existing neuron.
 * The dissolve delay can only be increased, never decreased.
 */
export function useIncreaseDelay() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: IncreaseDelayParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.increaseDelay.errors.failed));
      }

      const additional = Math.max(
        params.dissolveDelaySeconds - params.currentDissolveDelaySeconds,
        0,
      );
      await governanceCanister.increaseDissolveDelay({
        neuronId: params.neuronId,
        additionalDissolveDelaySeconds: additional,
      });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
    },
  });
}
