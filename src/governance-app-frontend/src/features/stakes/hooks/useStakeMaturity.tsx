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

type StakeMaturityParams = {
  neuronId: bigint;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

const PERCENTAGE_TO_STAKE = 100;

/**
 * Hook to stake maturity of a neuron.
 * Converts unstaked (liquid) maturity into staked maturity,
 * which increases voting power and compounds rewards.
 * Stakes 100% of available maturity.
 * A Ledger signer prompts the device for one approval.
 */
export function useStakeMaturity() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: StakeMaturityParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.stakeMaturity.errors.failed));
      }

      const stakeMaturity = (canister: NnsGovernanceCanister) =>
        canister.stakeMaturity({
          neuronId: params.neuronId,
          percentageToStake: PERCENTAGE_TO_STAKE,
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
            await stakeMaturity(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: 'stake_maturity',
            description: t(($) => $.common.ledgerApproval.stakeMaturity),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                  t(($) => $.common.ledgerApproval.percentage, { value: PERCENTAGE_TO_STAKE }),
                ]}
              />
            ),
          },
        );
      } else {
        await stakeMaturity(governanceCanister);
        await refresh();
      }
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.NeuronStakeMaturity);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronStakeMaturityError, { reason: getErrorReason(error) });
    },
  });
}
