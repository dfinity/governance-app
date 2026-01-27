import { nonNullish } from '@dfinity/utils';

export enum NeuronDetailView {
  Summary = 'summary',
  IncreaseStake = 'increaseStake',
  IncreaseDelay = 'increaseDelay',
  MaturityMode = 'maturityMode',
  Dissolve = 'dissolve',
  DevActions = 'devActions',
}

const NEURON_DETAIL_VIEWS = Object.values(NeuronDetailView);

export const isValidNeuronDetailView = (view: string | undefined): view is NeuronDetailView =>
  nonNullish(view) && NEURON_DETAIL_VIEWS.includes(view as NeuronDetailView);
