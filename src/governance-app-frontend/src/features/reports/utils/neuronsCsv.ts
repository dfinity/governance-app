import { type NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';

import { E8S, SECONDS_IN_DAY } from '@constants/extra';
import {
  getNeuronDissolveDelaySeconds,
  getNeuronFreeMaturityE8s,
  getNeuronMaturityDisbursementsInProgressE8s,
  getNeuronStakeAfterFeesE8s,
  getNeuronStakedMaturityE8s,
  isUserController,
} from '@utils/neuron';

import {
  asSpreadsheetText,
  buildCsv,
  type CsvColumn,
  formatE8sForCsv,
  formatHundredthsForCsv,
  formatUtcDate,
} from './csv';
import { toFiatHundredths } from './rates';

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
    stakeValue: string;
    availableMaturity: string;
    stakedMaturity: string;
    disbursingMaturity: string;
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

/** The dissolve date of a dissolving neuron, or the past one of a dissolved neuron. */
const getDissolveTimestampSeconds = ({ state, fullNeuron }: NeuronInfo): bigint | undefined =>
  (state === NeuronState.Dissolving || state === NeuronState.Dissolved) &&
  fullNeuron?.dissolveState !== undefined &&
  'WhenDissolvedTimestampSeconds' in fullNeuron.dissolveState
    ? fullNeuron.dissolveState.WhenDissolvedTimestampSeconds
    : undefined;

const byStakeDesc = (a: NeuronInfo, b: NeuronInfo): number => {
  const diff = getNeuronStakeAfterFeesE8s(b) - getNeuronStakeAfterFeesE8s(a);
  return diff > 0n ? 1 : diff < 0n ? -1 : 0;
};

/**
 * One row for each neuron, sorted by stake. The values are as of `now`. Without `icpPrice`, the
 * stake value cells are empty.
 */
export const buildNeuronsCsv = ({
  neurons,
  principalId,
  ledgerPrincipals,
  labels,
  now,
  icpPrice,
}: {
  neurons: NeuronInfo[];
  principalId: string;
  ledgerPrincipals: readonly string[];
  labels: NeuronsCsvLabels;
  now: Date;
  /** Today's price of 1 ICP in the currency of `labels.headers.stakeValue`. */
  icpPrice: number | undefined;
}): string => {
  const { headers } = labels;
  const icpPriceE8s =
    icpPrice === undefined || !Number.isFinite(icpPrice)
      ? undefined
      : BigInt(Math.round(icpPrice * E8S));

  const columns: CsvColumn<NeuronRow>[] = [
    { header: headers.neuronId, value: ({ neuron }) => asSpreadsheetText(String(neuron.neuronId)) },
    {
      header: headers.neuronAccountId,
      value: ({ neuron }) => neuron.fullNeuron?.accountIdentifier ?? '',
    },
    { header: headers.controller, value: ({ neuron }) => neuron.fullNeuron?.controller ?? '' },
    { header: headers.access, value: ({ access }) => labels.access[access] },
    {
      header: headers.stake,
      value: ({ neuron }) => formatE8sForCsv(getNeuronStakeAfterFeesE8s(neuron)),
    },
    {
      header: headers.stakeValue,
      value: ({ neuron }) =>
        icpPriceE8s === undefined
          ? ''
          : formatHundredthsForCsv(
              toFiatHundredths({
                amountE8s: getNeuronStakeAfterFeesE8s(neuron),
                icpToFiatE8s: icpPriceE8s,
              }),
            ),
    },
    {
      header: headers.availableMaturity,
      value: ({ neuron }) => formatE8sForCsv(getNeuronFreeMaturityE8s(neuron)),
    },
    {
      header: headers.stakedMaturity,
      value: ({ neuron }) => formatE8sForCsv(getNeuronStakedMaturityE8s(neuron)),
    },
    {
      header: headers.disbursingMaturity,
      value: ({ neuron }) => formatE8sForCsv(getNeuronMaturityDisbursementsInProgressE8s(neuron)),
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
        const seconds = getDissolveTimestampSeconds(neuron);
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
