import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import {
  getNeuronFreeMaturityE8s,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
  getNeuronIsMaxDissolveDelay,
  getNeuronStakeAfterFeesE8s,
  isUserHotkeyOnly,
} from '@utils/neuron';

import {
  type NeuronAction,
  NeuronDetailView,
  NeuronStandaloneAction,
} from '../components/neuronDetail';

/** The neuron commands of the command palette. */
export enum NeuronCommand {
  Open = 'open',
  IncreaseStake = 'increaseStake',
  IncreaseDelay = 'increaseDelay',
  StartDissolving = 'startDissolving',
  StopDissolving = 'stopDissolving',
  DisburseIcp = 'disburseIcp',
  DisburseMaturity = 'disburseMaturity',
  StakeMaturity = 'stakeMaturity',
}

/** The `action` search param of `/neurons` for each command. `Open` shows the summary. */
export const NEURON_COMMAND_ACTIONS: Record<NeuronCommand, NeuronAction | undefined> = {
  [NeuronCommand.Open]: undefined,
  [NeuronCommand.IncreaseStake]: NeuronDetailView.IncreaseStake,
  [NeuronCommand.IncreaseDelay]: NeuronDetailView.IncreaseDelay,
  [NeuronCommand.StartDissolving]: NeuronDetailView.Dissolve,
  [NeuronCommand.StopDissolving]: NeuronDetailView.Dissolve,
  [NeuronCommand.DisburseIcp]: NeuronStandaloneAction.DisburseIcp,
  [NeuronCommand.DisburseMaturity]: NeuronStandaloneAction.DisburseMaturity,
  [NeuronCommand.StakeMaturity]: NeuronStandaloneAction.StakeMaturity,
};

/**
 * Returns the commands that apply to the state of the neuron. A hotkey-only neuron gets only the
 * commands that need no controller. The disburse and stake maturity rules match the neuron card.
 */
export const getNeuronCommands = ({
  neuron,
  principalId,
  ledgerPrincipals,
}: {
  neuron: NeuronInfo;
  principalId?: string | null;
  ledgerPrincipals: readonly string[];
}): NeuronCommand[] => {
  const commands = [NeuronCommand.Open, NeuronCommand.IncreaseStake];
  if (isUserHotkeyOnly({ neuron, principalId, ledgerPrincipals })) return commands;

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const hasUnstakedMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;

  if (!getNeuronIsMaxDissolveDelay(neuron)) commands.push(NeuronCommand.IncreaseDelay);
  if (isDissolving) commands.push(NeuronCommand.StopDissolving);
  else if (!isDissolved) commands.push(NeuronCommand.StartDissolving);
  if (isDissolved && getNeuronStakeAfterFeesE8s(neuron) > 0n) {
    commands.push(NeuronCommand.DisburseIcp);
  }
  if (hasUnstakedMaturity) commands.push(NeuronCommand.DisburseMaturity);
  if (hasUnstakedMaturity && !isDissolved) commands.push(NeuronCommand.StakeMaturity);

  return commands;
};
