import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { List, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionListDialog } from '@features/account/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { DepositICPButton } from './DepositICPButton';

export function AccountCard() {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const balanceQuery = useIcpLedgerAccountBalance();

  const accountId = nonNullish(identity)
    ? AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      })
    : null;

  if (isNullish(accountId)) return null;

  const balanceICP = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(balanceICP * icpPrice.usd) : '-';

  return (
    <>
      <Card className="min-w-64" data-testid="available-balance-card">
        <CardHeader className="flex flex-col gap-0">
          <div className="flex w-full flex-row items-start justify-between space-y-0">
            <p className="text-sm tracking-wide text-muted-foreground uppercase">
              {t(($) => $.account.available)}
            </p>
            <Button variant="outline" size="icon" onClick={() => setIsDialogOpen(true)}>
              <List />
            </Button>
          </div>

          <div className="flex flex-col gap-0.5">
            {balanceQuery.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                {t(($) => $.common.inIcp, { value: formatNumber(balanceICP) })}
              </p>
            )}

            {balanceQuery.isLoading || tickersQuery.isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(($) => $.account.approxUsd, { value: usdValue })}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col justify-between gap-6">
          <div className="mt-auto flex flex-col gap-3">
            <Button size="xl" disabled className="w-full">
              <Plus />
              {t(($) => $.account.addIcp)}
            </Button>
            <DepositICPButton accountId={accountId} />
          </div>
        </CardContent>
      </Card>
      <TransactionListDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
