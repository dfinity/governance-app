import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type RefreshVotingPowerParams = {
  neuronId: bigint;
};

/**
 * Hook to confirm following on a neuron. Calling `refreshVotingPower` resets
 * the neuron's `votingPowerRefreshedTimestampSeconds`, restoring full voting
 * power and preventing the protocol from clearing its followees.
 */
export function useRefreshVotingPower() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async ({ neuronId }: RefreshVotingPowerParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuron.followingStatus.errors.failed));
      }

      await governanceCanister.refreshVotingPower({ neuronId });

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);
    },
  });
}
