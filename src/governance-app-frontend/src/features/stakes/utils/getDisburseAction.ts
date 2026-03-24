import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { getNeuronFreeMaturityE8s, getNeuronIsDissolved } from '@utils/neuron';

import { NeuronStandaloneAction } from '../components/neuronDetail';

export type DisburseAction =
  | { type: 'disabled' }
  | { type: 'navigate'; search: {} }
  | { type: 'navigate'; search: { neuronId: string; action: NeuronStandaloneAction } }
  | { type: 'choose'; neuron: NeuronInfo };

export function getDisburseAction(neurons: NeuronInfo[]): DisburseAction {
  const withdrawable = neurons.filter(
    (n) => getNeuronIsDissolved(n) || getNeuronFreeMaturityE8s(n) > 0n,
  );

  if (withdrawable.length === 0) return { type: 'disabled' };
  if (withdrawable.length > 1) return { type: 'navigate', search: {} };

  const neuron = withdrawable[0];
  const isDissolved = getNeuronIsDissolved(neuron);
  const hasMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;

  if (isDissolved && hasMaturity) {
    return { type: 'choose', neuron };
  }

  return {
    type: 'navigate',
    search: {
      neuronId: neuron.neuronId.toString(),
      action: isDissolved
        ? NeuronStandaloneAction.DisburseIcp
        : NeuronStandaloneAction.DisburseMaturity,
    },
  };
}
