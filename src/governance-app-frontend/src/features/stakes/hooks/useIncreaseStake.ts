import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

type IncreaseStakeParams = {
  neuronId: bigint;
  accountIdentifier: string;
  amount: number;
};

/**
 * Hook to increase stake on an existing neuron.
 * Following the nns-dapp pattern:
 * 1. Transfer ICP to the neuron's account identifier
 * 2. Call claimOrRefreshNeuron to update the cached stake
 */
export function useIncreaseStake() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();

  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (
    params: IncreaseStakeParams,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!governanceCanister || !ledgerCanister || !identity) {
      return {
        success: false,
        error: t(($) => $.neuronDetailModal.increaseStake.errors.failed),
      };
    }

    setIsProcessing(true);

    try {
      const amountE8s = bigIntMul(E8Sn, params.amount);

      // Step 1: Transfer ICP to the neuron's account identifier
      await ledgerCanister.transfer({
        to: AccountIdentifier.fromHex(params.accountIdentifier),
        amount: amountE8s,
        fee: ICP_TRANSACTION_FEE_E8Sn,
      });

      // Step 2: Refresh the neuron to update the cached stake
      await governanceCanister.claimOrRefreshNeuron({
        neuronId: params.neuronId,
        by: { NeuronIdOrSubaccount: {} },
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
