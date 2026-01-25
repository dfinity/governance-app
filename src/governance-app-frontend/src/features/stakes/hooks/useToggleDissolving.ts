import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

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

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: ToggleDissolvingParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.dissolve.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      if (params.startDissolving) {
        await governanceCanister.startDissolving(params.neuronId);
      } else {
        await governanceCanister.stopDissolving(params.neuronId);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: mapGovernanceCanisterError(err as Error),
      };
    } finally {
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      });

      setIsProcessing(false);
    }
  };

  return {
    execute,
    isProcessing,
  };
}
