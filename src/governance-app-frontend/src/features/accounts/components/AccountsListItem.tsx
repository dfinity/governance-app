import { List } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionListDialog } from '@features/transactions/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { CopyButton } from '@components/CopyButton';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';

import type { Account } from '../types';
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
                <p className="text-sm tracking-wide text-muted-foreground uppercase">
                  {account.name}
                </p>
                {account.type === 'subaccount' && (
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
    <div className="flex flex-col gap-0.5">
      <p className="text-2xl font-bold">
        {t(($) => $.common.inIcp, { value: formatNumber(balanceICP) })}
      </p>
      <p className="text-sm text-muted-foreground">
        {t(($) => $.account.approxUsd, { value: usdValue })}
      </p>
    </div>
  );
}
