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

const NEURON_ACTIONS = [
  ...Object.values(NeuronDetailView),
  ...Object.values(NeuronStandaloneAction),
] as string[];

export const isValidNeuronAction = (value: string | undefined): value is NeuronAction =>
  nonNullish(value) && NEURON_ACTIONS.includes(value);

export const isValidNeuronDetailView = (value: string | undefined): value is NeuronDetailView =>
  nonNullish(value) && (Object.values(NeuronDetailView) as string[]).includes(value);
