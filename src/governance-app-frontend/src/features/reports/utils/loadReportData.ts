import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import type { Identity } from '@icp-sdk/core/agent';

import type { FiatCurrency } from '@constants/fiat';
import {
  getGovernanceAppActor,
  getIcpIndexCanister,
  getNnsGovernanceCanister,
} from '@common/canisters';
import { neuronsRequest } from '@common/queries/governance';
import { nnsDappAccountQuery } from '@common/queries/nnsDapp';
import { isUserController } from '@common/utils/neuron';

import { fetchTransactionsSince, type GetTransactionsPage } from './fetchTransactions';
import type { ReportRange } from './period';
import {
  createReportRateLookup,
  getRateRange,
  type ReportRateLookup,
  toFiatSymbolParam,
} from './rates';
import {
  type EntityTransactions,
  isInRange,
  mapReportTransaction,
  type ReportEntity,
} from './transactionsCsv';

/** The daily ICP prices in `currency` for the range, from the backend history. */
export const loadReportRates = async ({
  range,
  currency,
}: {
  range: ReportRange;
  currency: FiatCurrency;
}): Promise<ReportRateLookup> => {
  const actor = await getGovernanceAppActor({ certified: false });
  const { fromMs, toMs } = getRateRange(range);
  const response = await actor.list_daily_exchange_rates({
    // The lookback can reach before 1970, and both fields are `nat64`.
    from_timestamp_seconds: BigInt(Math.max(0, Math.floor(fromMs / 1_000))),
    to_timestamp_seconds: BigInt(Math.max(0, Math.ceil(toMs / 1_000))),
    fiat_symbol: toFiatSymbolParam(currency),
  });

  if ('UnsupportedFiatSymbol' in response) {
    throw new Error(`The backend has no daily rates for ${currency}.`);
  }

  return createReportRateLookup({ rates: response.Ok, currency });
};

/** All neurons of the user, empty ones too. A certified call, because the data goes into a file. */
export const loadReportNeurons = async (): Promise<NeuronInfo[]> => {
  const canister = await getNnsGovernanceCanister();

  return canister.listNeurons({
    ...neuronsRequest({ includeEmptyNeurons: true }),
    certified: true,
  });
};

/**
 * The subaccounts and the Ledger device accounts from the NNS dapp canister. The report takes
 * them even when the matching advanced feature is off, so that no transaction is missing.
 */
export const loadNnsDappAccounts = async () => {
  const account = await nnsDappAccountQuery().updateFn();

  return {
    subAccounts: account?.sub_accounts ?? [],
    hardwareWallets: account?.hardware_wallet_accounts ?? [],
  };
};

/**
 * Returns the neurons that the user or a Ledger device of the user controls.
 * A neuron where the user is only a hotkey belongs to someone else.
 */
export const getOwnNeurons = ({
  identity,
  nnsDappAccounts,
  neurons,
}: {
  identity: Identity;
  nnsDappAccounts: Awaited<ReturnType<typeof loadNnsDappAccounts>>;
  neurons: NeuronInfo[];
}): NeuronInfo[] => {
  const principalId = identity.getPrincipal().toText();
  const ledgerPrincipals = nnsDappAccounts.hardwareWallets.map(({ principal }) =>
    principal.toText(),
  );
  return neurons.filter((neuron) => isUserController({ neuron, principalId, ledgerPrincipals }));
};

export const getReportEntities = ({
  identity,
  mainAccountName,
  nnsDappAccounts,
  neurons,
}: {
  identity: Identity;
  mainAccountName: string;
  nnsDappAccounts: Awaited<ReturnType<typeof loadNnsDappAccounts>>;
  neurons: NeuronInfo[];
}): ReportEntity[] => {
  const ownNeurons = getOwnNeurons({ identity, nnsDappAccounts, neurons });

  return [
    {
      kind: 'account',
      accountId: AccountIdentifier.fromPrincipal({ principal: identity.getPrincipal() }).toHex(),
      name: mainAccountName,
    },
    ...nnsDappAccounts.subAccounts.map(
      (subAccount): ReportEntity => ({
        kind: 'account',
        accountId: subAccount.account_identifier,
        name: subAccount.name,
      }),
    ),
    ...nnsDappAccounts.hardwareWallets.map(
      (wallet): ReportEntity => ({
        kind: 'account',
        accountId: wallet.account_identifier,
        name: wallet.name,
      }),
    ),
    ...ownNeurons.flatMap((neuron): ReportEntity[] =>
      neuron.fullNeuron
        ? [
            {
              kind: 'neuron',
              accountId: neuron.fullNeuron.accountIdentifier,
              neuronId: neuron.neuronId,
            },
          ]
        : [],
    ),
  ];
};

const getIndexPage: GetTransactionsPage = async ({ accountIdentifier, start, maxResults }) => {
  const canister = await getIcpIndexCanister();

  // Query calls: an update call returns at most 50 transactions, which makes a year very slow.
  return canister.getTransactions({ accountIdentifier, start, maxResults, certified: false });
};

/**
 * Runs `task` for each item, with at most `limit` tasks at one time. Keeps the order.
 * After a failure, no new task starts. The tasks in progress settle before the promise rejects,
 * so that a retry cannot overlap them.
 */
export const mapWithLimit = async <Item, Result>(
  items: Item[],
  limit: number,
  task: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results: Result[] = new Array(items.length);
  let next = 0;
  let failed = false;

  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  const rejection = settled.find((outcome) => outcome.status === 'rejected');
  if (rejection) throw rejection.reason;

  return results;
};

const CONCURRENT_ACCOUNTS = 6;

/** The current balance of an entity, and its transactions from now back to a start time. */
export type EntityHistory = EntityTransactions & { balanceE8s: bigint };

/**
 * Loads the transactions of each entity from now back to `fromMs`, as each entity sees them.
 * The list can have transactions before `fromMs`, from the last page.
 */
export const loadEntityHistories = async ({
  entities,
  fromMs,
  getPage = getIndexPage,
}: {
  entities: ReportEntity[];
  fromMs: number;
  getPage?: GetTransactionsPage;
}): Promise<{ histories: EntityHistory[]; complete: boolean }> => {
  const neuronAccountIds = new Set(
    entities.filter(({ kind }) => kind === 'neuron').map(({ accountId }) => accountId),
  );
  const ownAccountIds = new Set(entities.map(({ accountId }) => accountId));

  const fetched = await mapWithLimit(entities, CONCURRENT_ACCOUNTS, async (entity) => {
    const { balanceE8s, transactions, complete } = await fetchTransactionsSince({
      accountIdentifier: entity.accountId,
      fromMs,
      getPage,
    });

    return {
      complete,
      history: {
        entity,
        balanceE8s,
        transactions: transactions.map((transaction) =>
          mapReportTransaction({ entity, transaction, neuronAccountIds, ownAccountIds }),
        ),
      },
    };
  });

  return {
    histories: fetched.map(({ history }) => history),
    complete: fetched.every(({ complete }) => complete),
  };
};

export const loadReportTransactions = async ({
  entities,
  range,
  getPage,
}: {
  entities: ReportEntity[];
  range: ReportRange;
  getPage?: GetTransactionsPage;
}): Promise<{ results: EntityTransactions[]; complete: boolean }> => {
  const { histories, complete } = await loadEntityHistories({
    entities,
    fromMs: range.fromMs,
    getPage,
  });

  return {
    results: histories.map(({ entity, transactions }) => ({
      entity,
      transactions: transactions.filter((transaction) => isInRange(transaction, range)),
    })),
    complete,
  };
};
