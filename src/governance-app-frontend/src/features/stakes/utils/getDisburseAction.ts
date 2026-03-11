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
  | {
      type: DisburseActionType.Navigate;
      search: { neuronId: string; action: NeuronStandaloneAction };
    }
  | { type: DisburseActionType.Choose; neurons: NeuronInfo[] };

export function getDisburseAction(neurons: NeuronInfo[]): DisburseAction {
  const withdrawable = neurons.filter(
    (n) => getNeuronIsDissolved(n) || getNeuronFreeMaturityE8s(n) > 0n,
  );

  if (withdrawable.length === 0) return { type: DisburseActionType.Disabled };

  if (withdrawable.length === 1) {
    const neuron = withdrawable[0];
    const isDissolved = getNeuronIsDissolved(neuron);
    const hasMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;

    // Single neuron with both options → needs choice
    if (isDissolved && hasMaturity) {
      return { type: DisburseActionType.Choose, neurons: withdrawable };
    }

    // Single neuron with one option → navigate directly
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

  // Multiple neurons → needs choice
  return { type: DisburseActionType.Choose, neurons: withdrawable };
}
