import { QUERY_KEYS } from '@utils/query';
import { getIcpIndexCanister } from '@common/canisters';

import { CertifiedQuery } from './certified';

const getTransactions = async (
  accountIdentifier: string,
  maxResults: bigint,
  certified: boolean,
) => {
  const canister = await getIcpIndexCanister();

  return canister.getTransactions({ accountIdentifier, maxResults, certified });
};

type Transactions = Awaited<ReturnType<typeof getTransactions>>;

/** The short list of the latest transactions that the accounts page shows for each account. */
export const icpIndexAccountTransactionsQuery = (
  accountIdentifier: string,
  maxResults = 5n,
): CertifiedQuery<Transactions> => ({
  queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS, accountIdentifier, maxResults],
  queryFn: () => getTransactions(accountIdentifier, maxResults, false),
  updateFn: () => getTransactions(accountIdentifier, maxResults, true),
});
