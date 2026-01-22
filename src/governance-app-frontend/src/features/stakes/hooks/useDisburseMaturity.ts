import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

type DisburseMaturityParams = {
  neuronId: bigint;
};

/**
 * Hook to disburse maturity from a neuron.
 * Initiates the conversion of maturity to ICP (takes ~1 week).
 * Disburses 100% of available maturity.
 */
export function useDisburseMaturity() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: DisburseMaturityParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.disburseMaturity.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      await governanceCanister.disburseMaturity({
        neuronId: params.neuronId,
        percentageToDisburse: 100,
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
