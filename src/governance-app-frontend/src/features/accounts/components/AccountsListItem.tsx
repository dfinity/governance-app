import { ArrowDownLeft, List } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { DepositICPModal } from '@features/account/components/DepositICPModal';
import { SendICPButton } from '@features/account/components/SendICPButton';
import { TransactionListDialog } from '@features/transactions/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { CopyButton } from '@components/CopyButton';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useTickerPrices } from '@hooks/tickers';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate } from '@utils/date';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { useRecentTransactions } from '../hooks/useRecentTransactions';
import { type Account, AccountType, TransactionType } from '../types';
import { RenameSubAccountDialog } from './RenameSubAccountDialog';

type Props = {
  account: Account;
};

export const AccountsListItem = ({ account }: Props) => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery } = useTickerPrices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card className="gap-3">
        <CardHeader className="flex flex-col gap-0">
          <div className="flex w-full items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <p className="text-sm tracking-wide text-muted-foreground">{account.name}</p>
                {account.type === AccountType.Subaccount && (
                  <RenameSubAccountDialog
                    accountId={account.accountId}
                    currentName={account.name}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-xs text-muted-foreground">
                  {shortenId(account.accountId, 8)}
                </p>
                <CopyButton
                  value={account.accountId}
                  label={`${account.name} account id`}
                  size="sm"
                  variant="ghost"
                  className="size-6"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDialogOpen(true)}
              aria-label={t(($) => $.account.ariaLabel)}
              title={t(($) => $.account.ariaLabel)}
            >
              <List aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AccountBalance account={account} tickersQuery={tickersQuery} />
        </CardContent>
      </Card>
      <TransactionListDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        accountId={account.accountId}
      />
    </>
  );
};

function AccountBalance({
  account,
  tickersQuery,
}: {
  account: Account;
  tickersQuery: ReturnType<typeof useTickerPrices>['tickerPrices'];
}) {
  const { t } = useTranslation();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  if (account.status === 'loading') {
    return (
      <div className="flex flex-col gap-0.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  if (account.status === 'error') {
    return <p className="text-sm text-destructive">{t(($) => $.accounts.balanceError)}</p>;
  }

  const balanceICP = bigIntDiv(account.balanceE8s, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(balanceICP * icpPrice.usd) : '-';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-2xl font-bold">
          {t(($) => $.common.inIcp, { value: formatNumber(balanceICP) })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.account.approxUsd, { value: usdValue })}
        </p>
      </div>
      <div className="flex gap-3">
        <SendICPButton
          balance={balanceICP}
          fromSubAccount={account.subAccount}
          variant="advanced"
        />
        <Button
          variant="outline"
          size="xl"
          className="flex-1"
          onClick={() => setIsDepositOpen(true)}
        >
          <ArrowDownLeft aria-hidden="true" />
          {t(($) => $.common.receive)}
        </Button>
        <DepositICPModal
          open={isDepositOpen}
          onOpenChange={setIsDepositOpen}
          accountId={account.accountId}
        />
      </div>
      <Separator className="my-1" />
      <LastTransaction accountId={account.accountId} />
    </div>
  );
}

function LastTransaction({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const { byAccountId, isLoading: isTxLoading } = useRecentTransactions();
  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const { data: accountsState, isLoading: isAccountsLoading } = useAccounts();
  const userAccounts = accountsState?.accounts ?? [];

  if (isTxLoading || addressBookQuery.isLoading || isAccountsLoading) {
    return <Skeleton className="h-5 w-full" />;
  }

  const lastTx = byAccountId.get(accountId)?.[0];

  if (!lastTx) {
    return (
      <p className="text-sm text-muted-foreground">{t(($) => $.accounts.noTransactionsYet)}</p>
    );
  }

  const amountICP = bigIntDiv(lastTx.amountE8s, E8Sn);
  const amount = t(($) => $.common.inIcp, { value: formatNumber(amountICP) });

  const isReceive = lastTx.type === TransactionType.RECEIVE;
  const isStake = lastTx.type === TransactionType.STAKE;
  const amountColorClass = isReceive
    ? 'text-emerald-800 dark:text-emerald-400'
    : isStake
      ? ''
      : 'text-red-800 dark:text-red-400';

  const userAccount = userAccounts.find((a) => a.accountId === lastTx.counterparty);
  const addressBookName = addressBookEntries.find(
    (entry) => addressBookGetAddressString(entry.address) === lastTx.counterparty,
  )?.name;
  const address = userAccount?.name ?? addressBookName ?? shortenId(lastTx.counterparty, 8);

  const i18nKey = isReceive
    ? 'accounts.latestReceived'
    : isStake
      ? 'accounts.latestStaked'
      : 'accounts.latestSent';

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <p className="truncate">
        <Trans
          i18nKey={i18nKey}
          values={{ amount, address }}
          components={{
            amount: <span className={`font-semibold ${amountColorClass}`} />,
            address: <span className="font-semibold" />,
          }}
        />
      </p>
      <span className="shrink-0 text-muted-foreground">{secondsToDate(lastTx.timestamp)}</span>
    </div>
  );
}
