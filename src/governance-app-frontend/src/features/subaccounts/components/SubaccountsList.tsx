import type { Subaccount } from '../types';
import { SubaccountCard } from './SubaccountCard';

type Props = {
  accounts: Subaccount[];
};

export const SubaccountsList = ({ accounts }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => (
        <SubaccountCard key={account.accountId} account={account} />
      ))}
    </div>
  );
};
