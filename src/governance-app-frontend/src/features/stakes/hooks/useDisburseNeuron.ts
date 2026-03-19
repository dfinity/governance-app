import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type DisburseNeuronParams = {
  neuronId: bigint;
  toAccountId: string;
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

  return useMutation({
    mutationFn: async (params: DisburseNeuronParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.disburseIcp.errors.failed));
      }

      await governanceCanister.disburse({
        neuronId: params.neuronId,
        toAccountId: params.toAccountId,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, params.toAccountId],
        }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
      ]).catch(failedRefresh);
    },
  });
}
