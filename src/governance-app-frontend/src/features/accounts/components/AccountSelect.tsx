import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { NativeSelect, NativeSelectOption } from '@components/native-select';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { type Account, isAccountReady } from '../types';

type Props = {
  id: string;
  value?: string;
  onChange: (accountId: string) => void;
  onAccountChange?: (account: Account | undefined) => void;
  'data-testid'?: string;
};

export function AccountSelect({
  id,
  value,
  onChange,
  onAccountChange,
  'data-testid': testId,
}: Props) {
  const { t } = useTranslation();

  const { data: accountsState } = useAccounts();
  const accounts = accountsState?.accounts ?? [];

  const selectedAccount =
    accounts.find((a) => a.accountId === value) ??
    accounts.find((a) => a.accountId === accountsState?.mainAccountId);

  useEffect(() => {
    onAccountChange?.(selectedAccount);
  }, [selectedAccount, onAccountChange]);

  return (
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
  );
}
