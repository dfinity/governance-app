import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type ToggleDissolvingParams = {
  neuronId: bigint;
  startDissolving: boolean;
};

/**
 * Hook to start or stop dissolving a neuron.
 * - startDissolving: begins the countdown, after which ICP can be withdrawn
 * - stopDissolving: pauses the countdown and keeps the stake locked
 */
export function useToggleDissolving() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: ToggleDissolvingParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.dissolve.errors.failed));
      }

      if (params.startDissolving) {
        await governanceCanister.startDissolving(params.neuronId);
      } else {
        await governanceCanister.stopDissolving(params.neuronId);
      }

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
    },
  });
}
