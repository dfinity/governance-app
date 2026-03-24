import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { getNeuronFreeMaturityE8s, getNeuronIsDissolved } from '@utils/neuron';

import { NeuronStandaloneAction } from '../components/neuronDetail';

export enum DisburseActionType {
  Disabled = 'disabled',
  Navigate = 'navigate',
  Choose = 'choose',
}

export type DisburseAction =
  | { type: DisburseActionType.Disabled }
  | { type: DisburseActionType.Navigate; search: Record<string, never> }
  | {
      type: DisburseActionType.Navigate;
      search: { neuronId: string; action: NeuronStandaloneAction };
    }
  | { type: DisburseActionType.Choose; neuron: NeuronInfo };

export function getDisburseAction(neurons: NeuronInfo[]): DisburseAction {
  const withdrawable = neurons.filter(
    (n) => getNeuronIsDissolved(n) || getNeuronFreeMaturityE8s(n) > 0n,
  );

  if (withdrawable.length === 0) return { type: DisburseActionType.Disabled };
  if (withdrawable.length > 1) return { type: DisburseActionType.Navigate, search: {} };

  const neuron = withdrawable[0];
  const isDissolved = getNeuronIsDissolved(neuron);
  const hasMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;

  if (isDissolved && hasMaturity) {
    return { type: DisburseActionType.Choose, neuron };
  }

  return {
    type: DisburseActionType.Navigate,
    search: {
      neuronId: neuron.neuronId.toString(),
      action: isDissolved
        ? NeuronStandaloneAction.DisburseIcp
        : NeuronStandaloneAction.DisburseMaturity,
    },
  };
}
