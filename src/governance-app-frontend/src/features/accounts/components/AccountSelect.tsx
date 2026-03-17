import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@components/Label';
import { NativeSelect, NativeSelectOption } from '@components/native-select';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { type Account, isAccountReady } from '../types';

type Props = {
  id: string;
  label: string;
  value?: string;
  onChange: (accountId: string) => void;
  onAccountChange: (account: Account | undefined) => void;
  'data-testid'?: string;
};

export function AccountSelect({
  id,
  label,
  value,
  onChange,
  onAccountChange,
  'data-testid': testId,
}: Props) {
  const { t } = useTranslation();

  const { data: accountsState } = useAccounts();
  const accounts = accountsState?.accounts ?? [];
  const hasSubaccounts = accountsState?.hasSubaccounts ?? false;

  const selectedAccount =
    accounts.find((a) => a.accountId === value) ??
    accounts.find((a) => a.accountId === accountsState?.mainAccountId);

  useEffect(() => {
    onAccountChange(selectedAccount);
  }, [selectedAccount, onAccountChange]);

  if (!hasSubaccounts) return null;

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={selectedAccount?.accountId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
        data-testid={testId}
      >
        {accounts.map((account) => (
          <NativeSelectOption
            key={account.accountId}
            value={account.accountId}
            disabled={!isAccountReady(account)}
          >
            {account.name}
            {isAccountReady(account)
              ? ` — ${formatNumber(bigIntDiv(account.balanceE8s, E8Sn))} ICP`
              : ` — ${t(($) => $.common.loading)}…`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
