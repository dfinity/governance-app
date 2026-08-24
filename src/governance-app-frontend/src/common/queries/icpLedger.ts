import { QUERY_KEYS } from '@utils/query';
import { getIcpLedgerCanister } from '@common/canisters';

import { CertifiedQuery } from './certified';

const accountBalance = async (accountIdentifier: string, certified: boolean) => {
  const canister = await getIcpLedgerCanister();

  return canister.accountBalance({ accountIdentifier, certified });
};

export const icpLedgerAccountBalanceQuery = (
  accountIdentifier: string,
): CertifiedQuery<bigint> => ({
  queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, accountIdentifier],
  queryFn: () => accountBalance(accountIdentifier, false),
  updateFn: () => accountBalance(accountIdentifier, true),
});
