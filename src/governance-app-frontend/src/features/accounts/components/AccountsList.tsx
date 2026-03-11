import type { AccountWithBalance } from '../types';
import { AccountsListItem } from './AccountsListItem';

type Props = {
  accounts: AccountWithBalance[];
};

export const AccountsList = ({ accounts }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => (
        <AccountsListItem key={account.accountId} account={account} />
      ))}
    </div>
  );
};
