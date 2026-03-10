import type { Subaccount } from '../data/mockSubaccounts';

import { SubaccountCard } from './SubaccountCard';

type Props = {
  accounts: Subaccount[];
};

export const AccountsList = ({ accounts }: Props) => {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {accounts.map((account) => (
        <SubaccountCard key={account.subaccountIndex} account={account} />
      ))}
    </div>
  );
};
