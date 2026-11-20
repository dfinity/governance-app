import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';

import { getNeuronCommands, NeuronCommand } from './getNeuronCommands';

const USER = 'user-principal';
const DEVICE = 'device-principal';

const mockNeuron = ({
  state = NeuronState.Locked,
  dissolveDelaySeconds = 0n,
  stakeE8s = 100_000_000n,
  maturityE8s = 0n,
  controller = USER,
  hotKeys = [],
}: {
  state?: NeuronState;
  dissolveDelaySeconds?: bigint;
  stakeE8s?: bigint;
  maturityE8s?: bigint;
  controller?: string;
  hotKeys?: string[];
} = {}): NeuronInfo =>
  ({
    neuronId: 1n,
    state,
    dissolveDelaySeconds,
    fullNeuron: {
      controller,
      hotKeys,
      cachedNeuronStake: stakeE8s,
      neuronFees: 0n,
      maturityE8sEquivalent: maturityE8s,
    },
  }) as unknown as NeuronInfo;

const commandsOf = (neuron: NeuronInfo, ledgerPrincipals: string[] = []) =>
  getNeuronCommands({ neuron, principalId: USER, ledgerPrincipals });

describe('getNeuronCommands', () => {
  it('offers start dissolving for a locked neuron.', () => {
    expect(commandsOf(mockNeuron())).toEqual([
      NeuronCommand.Open,
      NeuronCommand.IncreaseStake,
      NeuronCommand.IncreaseDelay,
      NeuronCommand.StartDissolving,
    ]);
  });

  it('offers stop dissolving for a dissolving neuron.', () => {
    const commands = commandsOf(mockNeuron({ state: NeuronState.Dissolving }));

    expect(commands).toContain(NeuronCommand.StopDissolving);
    expect(commands).not.toContain(NeuronCommand.StartDissolving);
  });

  it('offers disburse ICP and no dissolve command for a dissolved neuron.', () => {
    const commands = commandsOf(mockNeuron({ state: NeuronState.Dissolved, maturityE8s: 10n }));

    expect(commands).toEqual([
      NeuronCommand.Open,
      NeuronCommand.IncreaseStake,
      NeuronCommand.IncreaseDelay,
      NeuronCommand.DisburseIcp,
      NeuronCommand.DisburseMaturity,
    ]);
  });

  it('offers no disburse ICP for a dissolved neuron with no stake.', () => {
    const commands = commandsOf(mockNeuron({ state: NeuronState.Dissolved, stakeE8s: 0n }));

    expect(commands).not.toContain(NeuronCommand.DisburseIcp);
  });

  it('offers the maturity commands for a neuron with unstaked maturity.', () => {
    const commands = commandsOf(mockNeuron({ maturityE8s: 10n }));

    expect(commands).toContain(NeuronCommand.DisburseMaturity);
    expect(commands).toContain(NeuronCommand.StakeMaturity);
  });

  it('offers no increase delay at the maximum dissolve delay.', () => {
    const neuron = mockNeuron({ dissolveDelaySeconds: BigInt(ICP_MAX_DISSOLVE_DELAY_SECONDS) });

    expect(commandsOf(neuron)).not.toContain(NeuronCommand.IncreaseDelay);
  });

  it('offers only the hotkey commands for a hotkey-only neuron.', () => {
    const neuron = mockNeuron({ controller: 'other', hotKeys: [USER], maturityE8s: 10n });

    expect(commandsOf(neuron)).toEqual([NeuronCommand.Open, NeuronCommand.IncreaseStake]);
  });

  it('keeps the controller commands for a neuron that a usable Ledger device controls.', () => {
    const neuron = mockNeuron({ controller: DEVICE, hotKeys: [USER] });

    expect(commandsOf(neuron, [DEVICE])).toContain(NeuronCommand.StartDissolving);
  });
});
