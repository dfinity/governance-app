import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import type { Identity } from '@icp-sdk/core/agent';

import { getIcpIndexCanister, getNnsGovernanceCanister } from '@common/canisters';
import { neuronsRequest } from '@common/queries/governance';
import { nnsDappAccountQuery } from '@common/queries/nnsDapp';

import { fetchTransactionsSince, type GetTransactionsPage } from './fetchTransactions';
import type { ReportRange } from './period';
import {
  type EntityTransactions,
  isInRange,
  mapReportTransaction,
  type ReportEntity,
} from './transactionsCsv';

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
}): ReportEntity[] => [
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
  ...neurons.flatMap((neuron): ReportEntity[] =>
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

const getIndexPage: GetTransactionsPage = async ({ accountIdentifier, start, maxResults }) => {
  const canister = await getIcpIndexCanister();

  // Query calls: an update call returns at most 50 transactions, which makes a year very slow.
  return canister.getTransactions({ accountIdentifier, start, maxResults, certified: false });
};

/** Runs `task` for each item, with at most `limit` tasks at one time. Keeps the order. */
const mapWithLimit = async <Item, Result>(
  items: Item[],
  limit: number,
  task: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results: Result[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const CONCURRENT_ACCOUNTS = 6;

export const loadReportTransactions = async ({
  entities,
  range,
  getPage = getIndexPage,
}: {
  entities: ReportEntity[];
  range: ReportRange;
  getPage?: GetTransactionsPage;
}): Promise<{ results: EntityTransactions[]; complete: boolean }> => {
  const neuronAccountIds = new Set(
    entities.filter(({ kind }) => kind === 'neuron').map(({ accountId }) => accountId),
  );

  const fetched = await mapWithLimit(entities, CONCURRENT_ACCOUNTS, async (entity) => {
    const { transactions, complete } = await fetchTransactionsSince({
      accountIdentifier: entity.accountId,
      range,
      getPage,
    });

    return {
      complete,
      result: {
        entity,
        transactions: transactions
          .map((transaction) => mapReportTransaction({ entity, transaction, neuronAccountIds }))
          .filter((transaction) => isInRange(transaction, range)),
      },
    };
  });

  return {
    results: fetched.map(({ result }) => result),
    complete: fetched.every(({ complete }) => complete),
  };
};
