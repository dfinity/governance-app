import { NeuronState } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { buildNeuronsCsv, NeuronAccess, type NeuronsCsvLabels } from './neuronsCsv';

const II = 'ii-principal';
const DEVICE = 'device-principal';
const OTHER = 'other-principal';
const NOW = new Date(Date.UTC(2026, 10, 15));
const NOW_SECONDS = BigInt(NOW.getTime() / 1_000);
const DAY = 86_400n;

const labels: NeuronsCsvLabels = {
  headers: {
    neuronId: 'ID',
    neuronAccountId: 'Account',
    controller: 'Controller',
    access: 'Access',
    stake: 'Stake',
    availableMaturity: 'Maturity',
    stakedMaturity: 'Staked',
    dissolveDelayDays: 'Delay',
    dissolveDate: 'Dissolve',
    creationDate: 'Created',
    state: 'State',
  },
  states: {
    [NeuronState.Unspecified]: 'Unspecified',
    [NeuronState.Locked]: 'Locked',
    [NeuronState.Dissolving]: 'Dissolving',
    [NeuronState.Dissolved]: 'Dissolved',
    [NeuronState.Spawning]: 'Spawning',
  },
  access: {
    [NeuronAccess.Controller]: 'Controller',
    [NeuronAccess.LedgerDevice]: 'Ledger',
    [NeuronAccess.Hotkey]: 'Hotkey',
  },
};

describe('buildNeuronsCsv', () => {
  it('writes one row for each neuron, sorted by stake', () => {
    const locked = mockNeuron({
      neuronId: 11n,
      state: NeuronState.Locked,
      createdTimestampSeconds: NOW_SECONDS - 400n * DAY,
      fullNeuron: {
        accountIdentifier: 'locked-account',
        controller: II,
        cachedNeuronStake: 100_000_000n,
        maturityE8sEquivalent: 2_500_000n,
        stakedMaturityE8sEquivalent: 1n,
        dissolveState: { DissolveDelaySeconds: 180n * DAY },
      },
    });
    const dissolving = mockNeuron({
      neuronId: 22n,
      state: NeuronState.Dissolving,
      createdTimestampSeconds: NOW_SECONDS,
      fullNeuron: {
        accountIdentifier: 'dissolving-account',
        controller: DEVICE,
        cachedNeuronStake: 500_000_000n,
        dissolveState: { WhenDissolvedTimestampSeconds: NOW_SECONDS + 30n * DAY },
      },
    });
    const hotkeyOnly = mockNeuron({
      neuronId: 33n,
      state: NeuronState.Dissolved,
      fullNeuron: { accountIdentifier: 'hotkey-account', controller: OTHER, hotKeys: [II] },
    });

    const csv = buildNeuronsCsv({
      neurons: [locked, hotkeyOnly, dissolving],
      principalId: II,
      ledgerPrincipals: [DEVICE],
      labels,
      now: NOW,
    });

    expect(csv.split('\r\n')).toEqual([
      '﻿ID,Account,Controller,Access,Stake,Maturity,Staked,Delay,Dissolve,Created,State',
      `"=""22""",dissolving-account,${DEVICE},Ledger,5.00000000,0.00000000,0.00000000,30,2026-12-15,2026-11-15,Dissolving`,
      `"=""11""",locked-account,${II},Controller,1.00000000,0.02500000,0.00000001,180,,2025-10-11,Locked`,
      `"=""33""",hotkey-account,${OTHER},Hotkey,0.00000000,0.00000000,0.00000000,0,,1970-01-01,Dissolved`,
      '',
    ]);
  });
});
