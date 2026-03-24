import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { NeuronStandaloneAction } from '../components/neuronDetail';
import { DisburseActionType, getDisburseAction } from './getDisburseAction';

const mockNeuron = (
  neuronId: bigint,
  overrides?: { state?: NeuronState; maturityE8sEquivalent?: bigint },
): NeuronInfo => ({
  neuronId,
  dissolveDelaySeconds: 0n,
  recentBallots: [],
  neuronType: undefined,
  createdTimestampSeconds: 0n,
  state: overrides?.state ?? NeuronState.Locked,
  joinedCommunityFundTimestampSeconds: undefined,
  retrievedAtTimestampSeconds: 0n,
  votingPower: 0n,
  votingPowerRefreshedTimestampSeconds: undefined,
  decidingVotingPower: undefined,
  potentialVotingPower: undefined,
  ageSeconds: 0n,
  fullNeuron: overrides?.maturityE8sEquivalent
    ? ({ maturityE8sEquivalent: overrides.maturityE8sEquivalent } as NeuronInfo['fullNeuron'])
    : undefined,
  visibility: undefined,
});

describe('getDisburseAction', () => {
  it('returns disabled when no neurons', () => {
    expect(getDisburseAction([])).toEqual({ type: DisburseActionType.Disabled });
  });

  it('returns disabled when no neurons are withdrawable', () => {
    const neurons = [mockNeuron(1n), mockNeuron(2n)];
    expect(getDisburseAction(neurons)).toEqual({ type: DisburseActionType.Disabled });
  });

  it('returns navigate without params when multiple neurons are withdrawable', () => {
    const neurons = [
      mockNeuron(1n, { state: NeuronState.Dissolved }),
      mockNeuron(2n, { maturityE8sEquivalent: 100n }),
    ];
    expect(getDisburseAction(neurons)).toEqual({
      type: DisburseActionType.Navigate,
      search: {},
    });
  });

  it('returns navigate with disburseIcp when single neuron is dissolved without maturity', () => {
    const neurons = [mockNeuron(1n, { state: NeuronState.Dissolved })];
    expect(getDisburseAction(neurons)).toEqual({
      type: DisburseActionType.Navigate,
      search: { neuronId: '1', action: NeuronStandaloneAction.DisburseIcp },
    });
  });

  it('returns navigate with disburseMaturity when single neuron has maturity but is not dissolved', () => {
    const neurons = [mockNeuron(1n, { maturityE8sEquivalent: 100n })];
    expect(getDisburseAction(neurons)).toEqual({
      type: DisburseActionType.Navigate,
      search: { neuronId: '1', action: NeuronStandaloneAction.DisburseMaturity },
    });
  });

  it('returns choose when single neuron is dissolved and has maturity', () => {
    const neuron = mockNeuron(1n, { state: NeuronState.Dissolved, maturityE8sEquivalent: 100n });
    expect(getDisburseAction([neuron])).toEqual({
      type: DisburseActionType.Choose,
      neuron,
    });
  });

  it('ignores non-withdrawable neurons when counting', () => {
    const neurons = [
      mockNeuron(1n), // locked, no maturity
      mockNeuron(2n), // locked, no maturity
      mockNeuron(3n, { state: NeuronState.Dissolved }),
    ];
    expect(getDisburseAction(neurons)).toEqual({
      type: DisburseActionType.Navigate,
      search: { neuronId: '3', action: NeuronStandaloneAction.DisburseIcp },
    });
  });
});
