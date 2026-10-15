import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type RefreshVotingPowerForNeuronsParams = {
  neuronIds: bigint[];
};

/**
 * Hook to confirm following on many neurons at once. It calls
 * `refreshVotingPower` for all neurons in parallel, and a failed call does not
 * stop the others.
 *
 * - If all calls fail, the mutation fails with the first error.
 * - If only some calls fail, the mutation fails with an `AggregateError` whose
 *   message gives the number of failed neurons.
 */
export function useRefreshVotingPowerForNeurons() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async ({ neuronIds }: RefreshVotingPowerForNeuronsParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuron.followingStatus.errors.failed));
      }

      const results = await Promise.allSettled(
        neuronIds.map((neuronId) => governanceCanister.refreshVotingPower({ neuronId })),
      );

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);

      const errors = results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      );
      if (errors.length === 0) return;
      if (errors.length === neuronIds.length) throw errors[0];
      throw new AggregateError(
        errors,
        t(($) => $.neuron.followingStatus.errors.failedSome, {
          failed: errors.length,
          total: neuronIds.length,
        }),
      );
    },
    onSuccess: (_, { neuronIds }) => {
      analytics.event(AnalyticsEvent.StakingRefreshVotingPowerAll, {
        neuron_count: String(neuronIds.length),
      });
    },
    onError: (error, { neuronIds }) => {
      const isPartial = error instanceof AggregateError;
      analytics.event(AnalyticsEvent.StakingRefreshVotingPowerAllError, {
        neuron_count: String(neuronIds.length),
        failed_count: String(isPartial ? error.errors.length : neuronIds.length),
        reason: getErrorReason(isPartial ? error.errors[0] : error),
      });
    },
  });
}
