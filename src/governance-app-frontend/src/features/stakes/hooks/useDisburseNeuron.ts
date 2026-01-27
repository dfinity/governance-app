import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
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

  return useMutation({
    mutationFn: async (params: DisburseNeuronParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.disburseIcp.errors.failed));
      }

      // Get user's account identifier to receive the disbursed ICP
      const toAccountId = AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      }).toHex();

      await governanceCanister.disburse({
        neuronId: params.neuronId,
        toAccountId,
      });
    },
    onSettled: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS] }),
      ]);
    },
  });
}
