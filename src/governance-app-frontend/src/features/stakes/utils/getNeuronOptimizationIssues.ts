import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import {
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolving,
  getNeuronIsMaxDissolveDelay,
} from '@utils/neuron';

export enum NeuronOptimizationIssue {
  NotLocked = 'notLocked',
  DelayLow = 'delayLow',
  NotAutoStaking = 'notAutoStaking',
}

/** The settings that keep a neuron below the maximum maturity rate. */
export const getNeuronOptimizationIssues = (neuron: NeuronInfo): NeuronOptimizationIssue[] => {
  const issues: NeuronOptimizationIssue[] = [];

  if (getNeuronIsDissolving(neuron)) issues.push(NeuronOptimizationIssue.NotLocked);
  if (!getNeuronIsMaxDissolveDelay(neuron)) issues.push(NeuronOptimizationIssue.DelayLow);
  if (!getNeuronIsAutoStakingMaturity(neuron)) issues.push(NeuronOptimizationIssue.NotAutoStaking);

  return issues;
};
