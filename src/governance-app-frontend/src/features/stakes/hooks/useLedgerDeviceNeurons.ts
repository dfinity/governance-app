import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@utils/query';
import { getNnsGovernanceCanister } from '@common/canisters';

const queryKey = (principal: string) => [QUERY_KEYS.NNS_GOVERNANCE.DEVICE_NEURONS, principal];

/**
 * The neurons that a Ledger device controls, read with a call that the device signs.
 *
 * `list_neurons` with the Internet Identity session returns only the neurons where that
 * principal is the controller or a hotkey. This query asks the governance canister as the
 * device, so it also returns the neurons that this app cannot see yet.
 *
 * Every fetch prompts the device once, so the result never goes stale by itself and the
 * cache drops it when the last dialog closes.
 */
export const useLedgerDeviceNeurons = ({
  principal,
  enabled,
}: {
  principal: string;
  enabled: boolean;
}) =>
  useQuery({
    queryKey: queryKey(principal),
    queryFn: async () => {
      const canister = await getNnsGovernanceCanister({ signer: { kind: 'ledger', principal } });

      return canister.listNeurons({ certified: true, includeEmptyNeurons: undefined });
    },
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

/** Updates one neuron in the cached device list, for example after the device added a hotkey. */
export const useUpdateLedgerDeviceNeuron = (principal: string) => {
  const queryClient = useQueryClient();

  return (neuronId: bigint, update: (neuron: NeuronInfo) => NeuronInfo) =>
    queryClient.setQueryData<NeuronInfo[]>(queryKey(principal), (neurons) =>
      neurons?.map((neuron) => (neuron.neuronId === neuronId ? update(neuron) : neuron)),
    );
};
