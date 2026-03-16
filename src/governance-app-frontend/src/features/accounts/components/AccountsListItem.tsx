import { ArrowDownLeft, List } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { DepositICPModal } from '@features/account/components/DepositICPModal';
import { SendICPButton } from '@features/account/components/SendICPButton';
import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';
import { TransactionType } from '@features/account/types';
import { TransactionListDialog } from '@features/transactions/components/TransactionListDialog';
import { detectTransactionType } from '@features/transactions/utils/transactionType';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { CopyButton } from '@components/CopyButton';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, NANOSECONDS_IN_SECOND } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpIndexAccountsTransactions } from '@hooks/icpIndex';
import { useTickerPrices } from '@hooks/tickers';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate } from '@utils/date';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { type Account, AccountType } from '../types';
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
        <CardContent className="flex flex-col gap-3">
          <AccountBalance account={account} tickersQuery={tickersQuery} />
          <Separator className="my-1" />
          <LastTransaction accountId={account.accountId} />
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
    </div>
  );
}

function LastTransaction({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();
  const txQuery = useIcpIndexAccountsTransactions({
    accountIds: [accountId],
  });
  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const { data: accountsState } = useAccounts();
  const userAccounts = accountsState?.accounts ?? [];

  if (txQuery.isLoading || addressBookQuery.isLoading) return <Skeleton className="h-5 w-full" />;

  const rawTx = txQuery.byAccountId[accountId]?.data?.response?.transactions[0];
  if (!rawTx) {
    return (
      <p className="text-sm text-muted-foreground">{t(($) => $.accounts.noTransactionsYet)}</p>
    );
  }

  const { operation, created_at_time, timestamp: txTimestamp } = rawTx.transaction;
  if (!('Transfer' in operation)) return null;

  const transfer = operation.Transfer;
  const type = detectTransactionType(operation, accountId, neuronAccountIds);
  const nanos = created_at_time[0]?.timestamp_nanos ?? txTimestamp[0]?.timestamp_nanos ?? 0n;
  const timestamp = Number(nanos / BigInt(NANOSECONDS_IN_SECOND));

  const counterparty = type === TransactionType.RECEIVE ? transfer.from : transfer.to;
  const amountICP = bigIntDiv(transfer.amount.e8s, E8Sn);
  const amount = t(($) => $.common.inIcp, { value: formatNumber(amountICP) });

  const isReceive = type === TransactionType.RECEIVE;
  const isStake = type === TransactionType.STAKE;
  const amountColorClass = isReceive
    ? 'text-emerald-800 dark:text-emerald-400'
    : isStake
      ? ''
      : 'text-red-800 dark:text-red-400';

  const userAccount = userAccounts.find((a) => a.accountId === counterparty);
  const addressBookName = addressBookEntries.find(
    (entry) => addressBookGetAddressString(entry.address) === counterparty,
  )?.name;
  const address = userAccount?.name ?? addressBookName ?? shortenId(counterparty, 8);

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <p className="truncate">
        <Trans
          i18nKey={($) =>
            isReceive
              ? $.accounts.latestReceived
              : isStake
                ? $.accounts.latestStaked
                : $.accounts.latestSent
          }
          values={{ amount, address }}
          components={{
            amount: <span className={`font-semibold ${amountColorClass}`} />,
            address: <span className="font-semibold" />,
          }}
        />
      </p>
      <span className="shrink-0 text-muted-foreground">{secondsToDate(timestamp)}</span>
    </div>
  );
}
