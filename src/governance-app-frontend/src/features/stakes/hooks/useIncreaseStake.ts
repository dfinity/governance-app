import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { bigIntMul } from '@utils/bigInt';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type IncreaseStakeParams = {
  neuronId: bigint;
  accountIdentifier: string;
  amount: number;
};

/**
 * Hook to increase stake on an existing neuron.
 * Following the nns-dapp pattern:
 * 1. Transfer ICP to the neuron's account identifier.
 * 2. Call claimOrRefreshNeuron to update the cached stake.
 */
export function useIncreaseStake() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);

  return useMutation({
    mutationFn: async (params: IncreaseStakeParams) => {
      if (!governanceCanister || !ledgerCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.increaseStake.errors.failed));
      }

      const amountE8s = bigIntMul(E8Sn, params.amount);

      // Use stored createdAt for retry deduplication, or generate a new one
      const createdAt = createdAtRef.current ?? nowInBigIntNanoSeconds();
      createdAtRef.current = createdAt;

      // Step 1: Transfer ICP to the neuron's account identifier
      await ledgerCanister.transfer({
        to: AccountIdentifier.fromHex(params.accountIdentifier),
        amount: amountE8s,
        fee: ICP_TRANSACTION_FEE_E8Sn,
        createdAt,
      });

      // Step 2: Refresh the neuron to update the cached stake
      await governanceCanister.claimOrRefreshNeuron({
        neuronId: params.neuronId,
        by: { NeuronIdOrSubaccount: {} },
      });

      // Reset createdAt only after the full flow succeeds
      createdAtRef.current = null;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS] }),
      ]).catch(failedRefresh);
    },
  });
}
