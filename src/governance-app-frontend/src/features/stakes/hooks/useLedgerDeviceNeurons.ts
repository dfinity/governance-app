import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@utils/query';
import { getNnsGovernanceCanister } from '@common/canisters';

type DeviceNeuronsKey = {
  principal: string;
  /** Changes on every open of the dialog, so each open asks the device again. */
  session: number;
};

const queryKey = ({ principal, session }: DeviceNeuronsKey) => [
  QUERY_KEYS.NNS_GOVERNANCE.DEVICE_NEURONS,
  principal,
  session,
];

/**
 * The neurons that a Ledger device controls, read with a call that the device signs.
 *
 * `list_neurons` with the Internet Identity session returns only the neurons where that
 * principal is the controller or a hotkey. This query asks the governance canister as the
 * device, so it also returns the neurons that this app cannot see yet. Neurons where the
 * device is only a hotkey are dropped: the hotkey action needs the controller.
 *
 * Every fetch prompts the device once, so the result never goes stale by itself. The cache
 * drops it when the last observer leaves, and a new `session` starts a fresh fetch.
 */
export const useLedgerDeviceNeurons = ({
  principal,
  session,
  enabled,
}: DeviceNeuronsKey & { enabled: boolean }) =>
  useQuery({
    queryKey: queryKey({ principal, session }),
    queryFn: async () => {
      const canister = await getNnsGovernanceCanister({ signer: { kind: 'ledger', principal } });
      const neurons = await canister.listNeurons({
        certified: true,
        includeEmptyNeurons: undefined,
      });

      return neurons.filter((neuron) => neuron.fullNeuron?.controller === principal);
    },
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

/** Updates one neuron in the cached device list, for example after the device added a hotkey. */
export const useUpdateLedgerDeviceNeuron = (key: DeviceNeuronsKey) => {
  const queryClient = useQueryClient();

  return (neuronId: bigint, update: (neuron: NeuronInfo) => NeuronInfo) =>
    queryClient.setQueryData<NeuronInfo[]>(queryKey(key), (neurons) =>
      neurons?.map((neuron) => (neuron.neuronId === neuronId ? update(neuron) : neuron)),
    );
};
