import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { describe, expect, it, vi } from 'vitest';

import { FiatCurrency } from '@constants/fiat';
import { mockNeuron } from '@fixtures/neuron';

import type { GetTransactionsPage } from './fetchTransactions';
import {
  getReportEntities,
  loadReportRates,
  loadReportTransactions,
  mapWithLimit,
} from './loadReportData';
import { MAX_RATE_LOOKBACK_DAYS } from './rates';
import { MAIN, NEURON, OTHER, transferTx } from './testUtils';
import { type ReportEntity, ReportTransactionType } from './transactionsCsv';

const listDailyExchangeRates = vi.hoisted(() => vi.fn());

vi.mock('@common/canisters', () => ({
  getIcpIndexCanister: vi.fn(),
  getNnsGovernanceCanister: vi.fn(),
  getGovernanceAppActor: async () => ({ list_daily_exchange_rates: listDailyExchangeRates }),
}));

const RANGE = { fromMs: Date.UTC(2025, 0, 1), toMs: Date.UTC(2026, 0, 1) };

const entities: ReportEntity[] = [
  { kind: 'account', accountId: MAIN, name: 'Main' },
  { kind: 'neuron', accountId: NEURON, neuronId: 1n },
];

const byAccount: Record<string, ReturnType<typeof transferTx>[]> = {
  [MAIN]: [
    transferTx({ id: 4n, ms: Date.UTC(2026, 0, 2), from: OTHER, to: MAIN, e8s: 1n }),
    transferTx({ id: 3n, ms: Date.UTC(2025, 5, 1), from: MAIN, to: NEURON, e8s: 2n }),
    transferTx({ id: 1n, ms: Date.UTC(2024, 11, 31), from: OTHER, to: MAIN, e8s: 3n }),
  ],
  [NEURON]: [transferTx({ id: 3n, ms: Date.UTC(2025, 5, 1), from: MAIN, to: NEURON, e8s: 2n })],
};

const getPage: GetTransactionsPage = async ({ accountIdentifier }) => ({
  balance: 0n,
  transactions: byAccount[accountIdentifier],
  oldest_tx_id: [byAccount[accountIdentifier].at(-1)!.id],
});

describe('loadReportTransactions', () => {
  it('keeps only the transactions in the range, as each entity sees them', async () => {
    const { results, complete } = await loadReportTransactions({ entities, range: RANGE, getPage });

    expect(complete).toBe(true);
    expect(results).toEqual([
      {
        entity: entities[0],
        transactions: [
          expect.objectContaining({ id: 3n, type: ReportTransactionType.Stake, amountE8s: -2n }),
        ],
      },
      {
        entity: entities[1],
        transactions: [
          expect.objectContaining({ id: 3n, type: ReportTransactionType.Stake, amountE8s: 2n }),
        ],
      },
    ]);
  });

  it('rejects when one account fails, so that no partial file is saved', async () => {
    const failing: GetTransactionsPage = async (params) =>
      params.accountIdentifier === NEURON ? Promise.reject(new Error('down')) : getPage(params);

    await expect(
      loadReportTransactions({ entities, range: RANGE, getPage: failing }),
    ).rejects.toThrow('down');
  });
});

describe('mapWithLimit', () => {
  it('keeps the order and runs at most `limit` tasks at one time', async () => {
    let running = 0;
    let maxRunning = 0;
    const task = async (item: number) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5 - item));
      running--;
      return item * 10;
    };

    expect(await mapWithLimit([1, 2, 3, 4, 5], 2, task)).toEqual([10, 20, 30, 40, 50]);
    expect(maxRunning).toBe(2);
  });

  it('starts no new task after a failure and lets the running ones settle first', async () => {
    const started: number[] = [];
    let slowSettled = false;
    const task = async (item: number) => {
      started.push(item);
      if (item === 1) throw new Error('down');
      await new Promise((resolve) => setTimeout(resolve, 10));
      slowSettled = true;
      return item;
    };

    await expect(mapWithLimit([1, 2, 3, 4], 2, task)).rejects.toThrow('down');
    expect(started).toEqual([1, 2]);
    expect(slowSettled).toBe(true);
  });
});

describe('getReportEntities', () => {
  it('lists the main account, the subaccounts, the Ledger accounts, and each own neuron account', () => {
    const identity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(1));
    const principalId = identity.getPrincipal().toText();
    const ledgerPrincipalId = Principal.anonymous().toText();
    const mainAccountId = AccountIdentifier.fromPrincipal({
      principal: identity.getPrincipal(),
    }).toHex();

    const entities = getReportEntities({
      identity,
      mainAccountName: 'Main',
      nnsDappAccounts: {
        subAccounts: [
          { name: 'Savings', account_identifier: 'savings-id', sub_account: new Uint8Array(32) },
        ],
        hardwareWallets: [
          { name: 'Nano', account_identifier: 'nano-id', principal: Principal.anonymous() },
        ],
      },
      neurons: [
        mockNeuron({
          neuronId: 7n,
          fullNeuron: { accountIdentifier: 'neuron-id', controller: principalId },
        }),
        mockNeuron({
          neuronId: 9n,
          fullNeuron: { accountIdentifier: 'ledger-neuron-id', controller: ledgerPrincipalId },
        }),
        mockNeuron({
          neuronId: 10n,
          fullNeuron: {
            accountIdentifier: 'hotkey-neuron-id',
            controller: 'aaaaa-aa',
            hotKeys: [principalId],
          },
        }),
        mockNeuron({ neuronId: 8n, fullNeuron: undefined }),
      ],
    });

    expect(entities).toEqual([
      { kind: 'account', accountId: mainAccountId, name: 'Main' },
      { kind: 'account', accountId: 'savings-id', name: 'Savings' },
      { kind: 'account', accountId: 'nano-id', name: 'Nano' },
      { kind: 'neuron', accountId: 'neuron-id', neuronId: 7n },
      { kind: 'neuron', accountId: 'ledger-neuron-id', neuronId: 9n },
    ]);
  });
});

describe('loadReportRates', () => {
  const lookbackStartSeconds = BigInt(RANGE.fromMs / 1_000 - MAX_RATE_LOOKBACK_DAYS * 86_400);
  const dailyRate = {
    timestamp_seconds: BigInt(Date.UTC(2025, 5, 1) / 1_000),
    icp_to_usd_e8s: [400_000_000n] as [bigint],
    usd_to_fiat_e8s: [90_000_000n] as [bigint],
    usd_to_fiat_is_final: true,
  };

  it('asks for the range plus the lookback days, with the fiat symbol', async () => {
    listDailyExchangeRates.mockResolvedValue({ Ok: [dailyRate] });

    const lookup = await loadReportRates({ range: RANGE, currency: FiatCurrency.EUR });

    expect(listDailyExchangeRates).toHaveBeenCalledWith({
      from_timestamp_seconds: lookbackStartSeconds,
      to_timestamp_seconds: BigInt(RANGE.toMs / 1_000),
      fiat_symbol: ['EUR'],
    });
    expect(lookup(Date.UTC(2025, 5, 1, 12))).toEqual({
      dayMs: Date.UTC(2025, 5, 1),
      fiatDayMs: Date.UTC(2025, 5, 1),
      fiatIsFinal: true,
      icpToFiatE8s: 360_000_000n,
    });
  });

  it('asks from 1970 at the earliest', async () => {
    listDailyExchangeRates.mockResolvedValue({ Ok: [] });

    await loadReportRates({
      range: { fromMs: 0, toMs: 86_400_000 },
      currency: FiatCurrency.EUR,
    });

    expect(listDailyExchangeRates).toHaveBeenCalledWith(
      expect.objectContaining({ from_timestamp_seconds: 0n, to_timestamp_seconds: 86_400n }),
    );
  });

  it('sends no fiat symbol for USD', async () => {
    listDailyExchangeRates.mockResolvedValue({ Ok: [dailyRate] });

    const lookup = await loadReportRates({ range: RANGE, currency: FiatCurrency.USD });

    expect(listDailyExchangeRates).toHaveBeenCalledWith(
      expect.objectContaining({ fiat_symbol: [] }),
    );
    expect(lookup(Date.UTC(2025, 5, 1))?.icpToFiatE8s).toBe(400_000_000n);
  });

  it('rejects when the backend does not support the currency', async () => {
    listDailyExchangeRates.mockResolvedValue({ UnsupportedFiatSymbol: { symbol: 'EUR' } });

    await expect(loadReportRates({ range: RANGE, currency: FiatCurrency.EUR })).rejects.toThrow(
      'EUR',
    );
  });
});
