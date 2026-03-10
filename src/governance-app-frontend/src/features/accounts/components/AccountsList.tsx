import type { Subaccount } from '../data/mockSubaccounts';

import { SubaccountCard } from './SubaccountCard';

type Props = {
  accounts: Subaccount[];
};

export const AccountsList = ({ accounts }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => (
        <SubaccountCard key={account.subaccountIndex} account={account} />
      ))}
    </div>
  );
};
