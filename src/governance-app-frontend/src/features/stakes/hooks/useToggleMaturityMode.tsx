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

type ToggleMaturityModeParams = {
  neuronId: bigint;
  autoStake: boolean;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

/**
 * Hook to toggle auto-stake maturity mode on a neuron.
 * When enabled, maturity is automatically staked to compound rewards.
 * When disabled, maturity stays available for withdrawal.
 * A Ledger signer prompts the device for one approval.
 */
export function useToggleMaturityMode() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: ToggleMaturityModeParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.maturityMode.errors.failed));
      }

      const setMaturityMode = (canister: NnsGovernanceCanister) =>
        canister.autoStakeMaturity({
          neuronId: params.neuronId,
          autoStake: params.autoStake,
        });

      const refresh = () =>
        queryClient
          .invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
          })
          .catch(failedRefresh);

      if (signer.kind === 'ledger') {
        await runLedgerCall(
          async (canister) => {
            await setMaturityMode(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: 'set_maturity_mode',
            description: t(($) => $.common.ledgerApproval.maturityMode),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                  params.autoStake
                    ? t(($) => $.common.ledgerApproval.autoStakeOn)
                    : t(($) => $.common.ledgerApproval.autoStakeOff),
                ]}
              />
            ),
          },
        );
      } else {
        await setMaturityMode(governanceCanister);
        await refresh();
      }
    },
    onSuccess: (_, params) => {
      analytics.event(AnalyticsEvent.NeuronSetMaturityMode, {
        mode: params.autoStake ? 'auto' : 'liquid',
      });
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronSetMaturityModeError, { reason: getErrorReason(error) });
    },
  });
}
