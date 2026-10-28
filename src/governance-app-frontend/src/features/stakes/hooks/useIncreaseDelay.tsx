import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';
import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from '@features/stakes/components/stakingWizard/constants';

import { useNnsGovernance } from '@hooks/governance';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { formatDissolveDelay } from '@utils/neuron';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import { useLedgerNeuronCall } from './useLedgerNeuronCall';

type IncreaseDelayParams = {
  neuronId: bigint;
  dissolveDelaySeconds: number;
  currentDissolveDelaySeconds: number;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

/**
 * Hook to increase dissolve delay on an existing neuron.
 * The dissolve delay can only be increased, never decreased.
 * A Ledger signer prompts the device for one approval.
 */
export function useIncreaseDelay() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: IncreaseDelayParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.increaseDelay.errors.failed));
      }

      const additional = Math.max(
        params.dissolveDelaySeconds - params.currentDissolveDelaySeconds,
        0,
      );
      const increaseDelay = (canister: NnsGovernanceCanister) =>
        canister.increaseDissolveDelay({
          neuronId: params.neuronId,
          additionalDissolveDelaySeconds: additional,
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
            await increaseDelay(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: 'increase_delay',
            description: t(($) => $.common.ledgerApproval.increaseDelay),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                  t(($) => $.common.ledgerApproval.additionalDelay, {
                    delay: formatDissolveDelay({
                      seconds: BigInt(additional),
                      i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
                    }),
                  }),
                ]}
              />
            ),
          },
        );
      } else {
        await increaseDelay(governanceCanister);
        await refresh();
      }
    },
    onSuccess: (_, params) => {
      analytics.event(AnalyticsEvent.NeuronIncreaseDelay, {
        dissolve_delay:
          STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.find(
            (option) => option.value === params.dissolveDelaySeconds,
          )?.labelKey ?? 'custom',
      });
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronIncreaseDelayError, { reason: getErrorReason(error) });
    },
  });
}
