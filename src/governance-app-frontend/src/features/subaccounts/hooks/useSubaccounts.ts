import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useQuery } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { QUERY_KEYS } from '@utils/query';

import type { Subaccount } from '../types';

const sortAccounts = (accounts: Subaccount[]): Subaccount[] => {
  const main = accounts.filter((a) => a.isMain);
  const rest = accounts
    .filter((a) => !a.isMain)
    .sort((a, b) => (b.balanceE8s > a.balanceE8s ? 1 : b.balanceE8s < a.balanceE8s ? -1 : 0));
  return [...main, ...rest];
};

/**
 * Fetches all user accounts (main + sub-accounts from NNS dapp) with their
 * current ICP balances from the ledger.
 * Sorted: main account first, then the rest by balance descending.
 */
export const useSubaccounts = () => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const nnsDappAccount = useNnsDappAccount();
  const { ready, authenticated, canister } = useIcpLedger();

  const accountDetails = nnsDappAccount.data?.response;

  const accountEntries = useMemo(() => {
    if (!identity) return undefined;

    const mainAccountId = AccountIdentifier.fromPrincipal({
      principal: identity.getPrincipal(),
    }).toHex();

    const main = {
      name: t(($) => $.accounts.mainAccount),
      accountId: mainAccountId,
      isMain: true,
    };

    const subs = (accountDetails?.sub_accounts ?? []).map((sa) => ({
      name: sa.name,
      accountId: sa.account_identifier,
      isMain: false,
    }));

    return [main, ...subs];
  }, [identity, accountDetails, t]);

  const accountIds = accountEntries?.map((a) => a.accountId);

  const balancesQuery = useQuery({
    queryKey: [QUERY_KEYS.ACCOUNTS.SUBACCOUNT_BALANCES, accountIds],
    queryFn: () =>
      Promise.all(
        accountEntries!.map((acc) =>
          canister!.accountBalance({
            accountIdentifier: acc.accountId,
            certified: false,
          }),
        ),
      ),
    enabled: !!accountEntries && ready && authenticated,
  });

  const data = useMemo(() => {
    if (!accountEntries || !balancesQuery.data) return undefined;
    const accounts: Subaccount[] = accountEntries.map((acc, i) => ({
      ...acc,
      balanceE8s: balancesQuery.data[i],
    }));
    return sortAccounts(accounts);
  }, [accountEntries, balancesQuery.data]);

  return {
    data,
    isLoading: nnsDappAccount.isLoading || balancesQuery.isLoading,
  };
};
