import { Skeleton } from '@components/Skeleton';

import { useAccounts } from '../hooks/useAccounts';
import { AccountsListItem } from './AccountsListItem';

export const AccountsList = () => {
  const { data: accountsState } = useAccounts();
  const accounts = accountsState?.accounts ?? [];

  if (!accountsState) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {accounts.map((account) => (
        <AccountsListItem key={account.accountId} account={account} />
      ))}
    </div>
  );
};
