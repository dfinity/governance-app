export enum NeuronDetailView {
  Summary = 'summary',
  IncreaseStake = 'increaseStake',
  IncreaseDelay = 'increaseDelay',
  MaturityMode = 'maturityMode',
  Dissolve = 'dissolve',
}

export const NEURON_DETAIL_VIEWS = Object.values(NeuronDetailView);

export const isValidNeuronDetailView = (view: string | undefined): view is NeuronDetailView =>
  view !== undefined && NEURON_DETAIL_VIEWS.includes(view as NeuronDetailView);
