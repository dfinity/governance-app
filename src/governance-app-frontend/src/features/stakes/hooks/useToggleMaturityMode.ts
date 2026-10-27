import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsGovernance } from '@hooks/governance';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type ToggleMaturityModeParams = {
  neuronId: bigint;
  autoStake: boolean;
};

/**
 * Hook to toggle auto-stake maturity mode on a neuron.
 * When enabled, maturity is automatically staked to compound rewards.
 * When disabled, maturity stays available for withdrawal.
 */
export function useToggleMaturityMode() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: ToggleMaturityModeParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.maturityMode.errors.failed));
      }

      await governanceCanister.autoStakeMaturity({
        neuronId: params.neuronId,
        autoStake: params.autoStake,
      });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
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
