import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type StakeMaturityParams = {
  neuronId: bigint;
};

/**
 * Hook to stake maturity of a neuron.
 * Converts unstaked (liquid) maturity into staked maturity,
 * which increases voting power and compounds rewards.
 * Stakes 100% of available maturity.
 */
export function useStakeMaturity() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: StakeMaturityParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.stakeMaturity.errors.failed));
      }

      await governanceCanister.stakeMaturity({
        neuronId: params.neuronId,
        percentageToStake: 100,
      });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.NeuronStakeMaturity);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronStakeMaturityError, { reason: getErrorReason(error) });
    },
  });
}
