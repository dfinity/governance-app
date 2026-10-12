import { SkeletonAccountCard } from '@components/skeletons/SkeletonAccountCard';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';

import { useAccounts } from '../hooks/useAccounts';
import { AccountsListItem } from './AccountsListItem';

export const AccountsList = () => {
  const { data: accountsState } = useAccounts();
  const accounts = accountsState?.accounts ?? [];

  if (!accountsState) {
    return (
      <SkeletonScreen className="flex flex-col gap-4">
        <SkeletonAccountCard />
        <SkeletonAccountCard />
      </SkeletonScreen>
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
