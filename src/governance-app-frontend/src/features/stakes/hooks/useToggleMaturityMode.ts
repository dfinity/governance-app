import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

type ToggleMaturityModeParams = {
  neuronId: bigint;
  autoStake: boolean;
};

/**
 * Hook to toggle auto-stake maturity mode on a neuron.
 * When enabled, maturity is automatically staked to compound rewards.
 * When disabled, maturity stays available for withdrawal.
 */
export function useToggleMaturityMode() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: ToggleMaturityModeParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.maturityMode.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      await governanceCanister.autoStakeMaturity({
        neuronId: params.neuronId,
        autoStake: params.autoStake,
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
