import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

type DisburseNeuronParams = {
  neuronId: bigint;
};

/**
 * Hook to disburse a dissolved neuron.
 * Transfers the neuron's stake back to the user's account.
 */
export function useDisburseNeuron() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: DisburseNeuronParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.disburseIcp.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      // Get user's account identifier to receive the disbursed ICP
      const toAccountId = AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      }).toHex();

      await governanceCanister.disburse({
        neuronId: params.neuronId,
        toAccountId,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: mapGovernanceCanisterError(err as Error),
      };
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS] }),
      ]);

      setIsProcessing(false);
    }
  };

  return {
    execute,
    isProcessing,
  };
}
