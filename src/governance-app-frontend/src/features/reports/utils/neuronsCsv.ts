import { type NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';

import { SECONDS_IN_DAY } from '@constants/extra';
import {
  getDissolvingTimestampSeconds,
  getNeuronDissolveDelaySeconds,
  getNeuronFreeMaturityE8s,
  getNeuronStakedMaturityE8s,
  getNeuronStakeE8s,
  isUserController,
} from '@utils/neuron';

import { asSpreadsheetText, buildCsv, type CsvColumn, formatE8sForCsv, formatUtcDate } from './csv';

export enum NeuronAccess {
  Controller = 'controller',
  LedgerDevice = 'ledgerDevice',
  Hotkey = 'hotkey',
}

export type NeuronsCsvLabels = {
  headers: {
    neuronId: string;
    neuronAccountId: string;
    controller: string;
    access: string;
    stake: string;
    availableMaturity: string;
    stakedMaturity: string;
    dissolveDelayDays: string;
    dissolveDate: string;
    creationDate: string;
    state: string;
  };
  states: Record<NeuronState, string>;
  access: Record<NeuronAccess, string>;
};

type NeuronRow = {
  neuron: NeuronInfo;
  access: NeuronAccess;
};

export const getNeuronAccess = ({
  neuron,
  principalId,
  ledgerPrincipals,
}: {
  neuron: NeuronInfo;
  principalId: string;
  ledgerPrincipals: readonly string[];
}): NeuronAccess => {
  if (neuron.fullNeuron?.controller === principalId) return NeuronAccess.Controller;
  if (isUserController({ neuron, principalId, ledgerPrincipals })) return NeuronAccess.LedgerDevice;
  return NeuronAccess.Hotkey;
};

const byStakeDesc = (a: NeuronInfo, b: NeuronInfo): number => {
  const diff = getNeuronStakeE8s(b) - getNeuronStakeE8s(a);
  return diff > 0n ? 1 : diff < 0n ? -1 : 0;
};

/** One row for each neuron, sorted by stake. The values are as of `now`. */
export const buildNeuronsCsv = ({
  neurons,
  principalId,
  ledgerPrincipals,
  labels,
  now,
}: {
  neurons: NeuronInfo[];
  principalId: string;
  ledgerPrincipals: readonly string[];
  labels: NeuronsCsvLabels;
  now: Date;
}): string => {
  const { headers } = labels;

  const columns: CsvColumn<NeuronRow>[] = [
    { header: headers.neuronId, value: ({ neuron }) => asSpreadsheetText(String(neuron.neuronId)) },
    {
      header: headers.neuronAccountId,
      value: ({ neuron }) => neuron.fullNeuron?.accountIdentifier ?? '',
    },
    { header: headers.controller, value: ({ neuron }) => neuron.fullNeuron?.controller ?? '' },
    { header: headers.access, value: ({ access }) => labels.access[access] },
    { header: headers.stake, value: ({ neuron }) => formatE8sForCsv(getNeuronStakeE8s(neuron)) },
    {
      header: headers.availableMaturity,
      value: ({ neuron }) => formatE8sForCsv(getNeuronFreeMaturityE8s(neuron)),
    },
    {
      header: headers.stakedMaturity,
      value: ({ neuron }) => formatE8sForCsv(getNeuronStakedMaturityE8s(neuron)),
    },
    {
      header: headers.dissolveDelayDays,
      value: ({ neuron }) => {
        const seconds = getNeuronDissolveDelaySeconds(neuron, now);
        return String(seconds > 0n ? seconds / BigInt(SECONDS_IN_DAY) : 0n);
      },
    },
    {
      header: headers.dissolveDate,
      value: ({ neuron }) => {
        const seconds = getDissolvingTimestampSeconds(neuron);
        return seconds === undefined ? '' : formatUtcDate(Number(seconds) * 1_000);
      },
    },
    {
      header: headers.creationDate,
      value: ({ neuron }) => formatUtcDate(Number(neuron.createdTimestampSeconds) * 1_000),
    },
    { header: headers.state, value: ({ neuron }) => labels.states[neuron.state] },
  ];

  const rows = neurons.toSorted(byStakeDesc).map((neuron) => ({
    neuron,
    access: getNeuronAccess({ neuron, principalId, ledgerPrincipals }),
  }));

  return buildCsv(columns, rows);
};
