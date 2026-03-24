import { nonNullish } from '@dfinity/utils';

/** Views rendered inside the NeuronDetailModal. */
export enum NeuronDetailView {
  Summary = 'summary',
  IncreaseStake = 'increaseStake',
  IncreaseDelay = 'increaseDelay',
  MaturityMode = 'maturityMode',
  Dissolve = 'dissolve',
  DevActions = 'devActions',
}

/** Standalone modal actions opened outside the NeuronDetailModal. */
export enum NeuronStandaloneAction {
  DisburseIcp = 'disburseIcp',
  DisburseMaturity = 'disburseMaturity',
  StakeMaturity = 'stakeMaturity',
}

/** All valid values for the `action` URL search param. */
export type NeuronAction = NeuronDetailView | NeuronStandaloneAction;

const NEURON_DETAIL_VIEWS = Object.values(NeuronDetailView) as string[];
const NEURON_STANDALONE_ACTIONS = Object.values(NeuronStandaloneAction) as string[];
const NEURON_ACTIONS = [...NEURON_DETAIL_VIEWS, ...NEURON_STANDALONE_ACTIONS];

export const isValidNeuronAction = (view: string | undefined): view is NeuronAction =>
  nonNullish(view) && NEURON_ACTIONS.includes(view);

export const isValidNeuronDetailView = (view: string | undefined): view is NeuronDetailView =>
  nonNullish(view) && NEURON_DETAIL_VIEWS.includes(view);
