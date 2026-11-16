import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';

import { useNnsGovernance } from '@hooks/governance';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import { useLedgerNeuronCall } from './useLedgerNeuronCall';

type ToggleDissolvingParams = {
  neuronId: bigint;
  startDissolving: boolean;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

/**
 * Hook to start or stop dissolving a neuron.
 * - startDissolving: begins the countdown, after which ICP can be withdrawn
 * - stopDissolving: pauses the countdown and keeps the stake locked
 * A Ledger signer prompts the device for one approval.
 */
export function useToggleDissolving() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: ToggleDissolvingParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.dissolve.errors.failed));
      }

      const toggleDissolving = (canister: NnsGovernanceCanister) =>
        params.startDissolving
          ? canister.startDissolving(params.neuronId)
          : canister.stopDissolving(params.neuronId);

      const refresh = () =>
        queryClient
          .invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
          })
          .catch(failedRefresh);

      if (signer.kind === 'ledger') {
        await runLedgerCall(
          async (canister) => {
            await toggleDissolving(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: params.startDissolving ? 'start_dissolving' : 'stop_dissolving',
            description: params.startDissolving
              ? t(($) => $.common.ledgerApproval.startDissolving)
              : t(($) => $.common.ledgerApproval.stopDissolving),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                ]}
              />
            ),
          },
        );
      } else {
        await toggleDissolving(governanceCanister);
        await refresh();
      }
    },
    onSuccess: (_, params) => {
      analytics.event(AnalyticsEvent.NeuronToggleDissolving, {
        action: params.startDissolving ? 'start' : 'stop',
      });
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronToggleDissolvingError, {
        reason: getErrorReason(error),
      });
    },
  });
}
