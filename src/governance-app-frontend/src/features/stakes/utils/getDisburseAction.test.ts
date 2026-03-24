import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { NeuronStandaloneAction } from '../components/neuronDetail';
import { getDisburseAction } from './getDisburseAction';

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
    expect(getDisburseAction([])).toEqual({ type: 'disabled' });
  });

  it('returns disabled when no neurons are withdrawable', () => {
    const neurons = [mockNeuron(1n), mockNeuron(2n)];
    expect(getDisburseAction(neurons)).toEqual({ type: 'disabled' });
  });

  it('returns navigate without search when multiple neurons are withdrawable', () => {
    const neurons = [
      mockNeuron(1n, { state: NeuronState.Dissolved }),
      mockNeuron(2n, { maturityE8sEquivalent: 100n }),
    ];
    expect(getDisburseAction(neurons)).toEqual({ type: 'navigate', search: {} });
  });

  it('returns disburseIcp when single neuron is dissolved without maturity', () => {
    const neurons = [mockNeuron(1n, { state: NeuronState.Dissolved })];
    expect(getDisburseAction(neurons)).toEqual({
      type: 'navigate',
      search: { neuronId: '1', action: NeuronStandaloneAction.DisburseIcp },
    });
  });

  it('returns disburseMaturity when single neuron has maturity but is not dissolved', () => {
    const neurons = [mockNeuron(1n, { maturityE8sEquivalent: 100n })];
    expect(getDisburseAction(neurons)).toEqual({
      type: 'navigate',
      search: { neuronId: '1', action: NeuronStandaloneAction.DisburseMaturity },
    });
  });

  it('returns choose when single neuron is dissolved and has maturity', () => {
    const neuron = mockNeuron(1n, { state: NeuronState.Dissolved, maturityE8sEquivalent: 100n });
    expect(getDisburseAction([neuron])).toEqual({ type: 'choose', neuron });
  });

  it('ignores non-withdrawable neurons when counting', () => {
    const neurons = [
      mockNeuron(1n), // locked, no maturity
      mockNeuron(2n), // locked, no maturity
      mockNeuron(3n, { state: NeuronState.Dissolved }),
    ];
    expect(getDisburseAction(neurons)).toEqual({
      type: 'navigate',
      search: { neuronId: '3', action: NeuronStandaloneAction.DisburseIcp },
    });
  });
});
