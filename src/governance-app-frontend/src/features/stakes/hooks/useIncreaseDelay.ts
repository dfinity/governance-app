import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SECONDS_IN_MONTH } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

type IncreaseDelayParams = {
  neuronId: bigint;
  dissolveDelayMonths: number;
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

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: IncreaseDelayParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.increaseDelay.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      // Calculate the new dissolve delay timestamp
      // This is the current time + the delay in seconds
      const newDissolveTimestamp =
        Math.floor(Date.now() / 1000) + params.dissolveDelayMonths * SECONDS_IN_MONTH;

      await governanceCanister.setDissolveDelay({
        neuronId: params.neuronId,
        dissolveDelaySeconds: newDissolveTimestamp,
      });

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
