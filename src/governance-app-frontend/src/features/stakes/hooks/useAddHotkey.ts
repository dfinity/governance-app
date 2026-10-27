import { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { getNnsGovernanceCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

type AddHotkeyParams = {
  neuronId: bigint;
  /** The principal that becomes a hotkey. */
  principal: string;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

/**
 * Adds a hotkey to a neuron.
 * Hotkeys can vote, set followees, refresh voting power, and manage Neurons' Fund participation.
 * A Ledger signer prompts the device for one approval, after the pending device calls settle.
 */
export function useAddHotkey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ neuronId, principal, signer = II_SIGNER }: AddHotkeyParams) => {
      const call = async () => {
        const canister = await getNnsGovernanceCanister({ signer });

        await canister.addHotkey({ neuronId, principal: Principal.fromText(principal) });
      };

      if (signer.kind === 'ledger') await runOnDevice(signer.principal, call);
      else await call();

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
  });
}
