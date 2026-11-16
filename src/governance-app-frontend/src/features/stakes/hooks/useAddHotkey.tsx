import { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';

import { DeviceActionCancelledError } from '@hooks/useDeviceAction';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { getNnsGovernanceCanister } from '@common/canisters';
import { runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
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
 * A Ledger signer signs on the device, behind the approval dialog of `runApprovedDeviceCall`:
 * at its queue turn, after the approval in progress on any device, and pending after a
 * cancel until the device answers.
 */
export function useAddHotkey() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ neuronId, principal, signer = II_SIGNER }: AddHotkeyParams) => {
      const call = async (canister: Awaited<ReturnType<typeof getNnsGovernanceCanister>>) => {
        await canister.addHotkey({ neuronId, principal: Principal.fromText(principal) });
      };

      if (signer.kind === 'ledger') {
        await runApprovedDeviceCall(
          signer.principal,
          async (signal) => {
            const canister = await getNnsGovernanceCanister({ signer });
            // A cancel during the connection must not start a signing request.
            if (signal.aborted) throw new DeviceActionCancelledError();
            await call(canister);
          },
          {
            description: t(($) => $.common.ledgerApproval.addHotkey),
            detail: <DeviceActionDetail lines={[principal]} />,
          },
        );
      } else {
        await call(await getNnsGovernanceCanister({ signer }));
      }

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
  });
}
