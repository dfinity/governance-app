import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { List } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SendICPsButton } from '@features/account/components/SendICPsButton';
import { TransactionListDialog } from '@features/account/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { GetTokens } from '@/dev/GetTokens';

import { BuyIcpsButton } from './BuyIcpsButton';
import { DepositICPsButton } from './DepositICPsButton';

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

  const balanceICPs = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn, 2);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(balanceICPs * icpPrice.usd) : '-';

  return (
    <>
      <Card className="flex-1 gap-3 transition-all duration-300 hover:shadow-[0_0_25px_-5px_rgba(0,0,0,0.25)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-medium tracking-wide text-muted-foreground uppercase">
            {t(($) => $.account.available)}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              {balanceQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold">
                  {t(($) => $.common.inIcp, { value: balanceICPs })}
                </p>
              )}

              {balanceQuery.isLoading || tickersQuery.isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t(($) => $.account.approxUsd, { value: usdValue })}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {IS_TESTNET ? (
                <GetTokens accountId={accountId} />
              ) : (
                <BuyIcpsButton accountId={accountId} />
              )}
              <div className="flex gap-3">
                <DepositICPsButton accountId={accountId} />
                <SendICPsButton balance={balanceICPs} />
              </div>

              <Button
                variant="outline"
                className="w-full"
                size="xl"
                onClick={() => setIsDialogOpen(true)}
              >
                <List />
                {t(($) => $.common.transactions)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <TransactionListDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
