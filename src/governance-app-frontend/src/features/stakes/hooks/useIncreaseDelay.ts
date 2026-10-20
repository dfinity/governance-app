import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from '@features/stakes/components/stakingWizard/constants';

import { useNnsGovernance } from '@hooks/governance';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type IncreaseDelayParams = {
  neuronId: bigint;
  dissolveDelaySeconds: number;
  currentDissolveDelaySeconds: number;
};

/**
 * Hook to increase dissolve delay on an existing neuron.
 * The dissolve delay can only be increased, never decreased.
 */
export function useIncreaseDelay() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: IncreaseDelayParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.increaseDelay.errors.failed));
      }

      const additional = Math.max(
        params.dissolveDelaySeconds - params.currentDissolveDelaySeconds,
        0,
      );
      await governanceCanister.increaseDissolveDelay({
        neuronId: params.neuronId,
        additionalDissolveDelaySeconds: additional,
      });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
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
