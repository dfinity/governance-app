import { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type AddHotkeyParams = {
  neuronId: bigint;
  principal: string;
};

/**
 * Hook to add a hotkey to a neuron.
 * Hotkeys can vote, set followees, refresh voting power, and manage Neurons' Fund participation.
 */
export function useAddHotkey() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: AddHotkeyParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.devActionsModal.addHotkey.errors.failed));
      }

      await governanceCanister.addHotkey({
        neuronId: params.neuronId,
        principal: Principal.fromText(params.principal),
      });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
    },
  });
}
