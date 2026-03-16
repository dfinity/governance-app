import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { List, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionListDialog } from '@features/transactions/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { GetTokens } from '@/dev/GetTokens';

import { SendICPButton } from './SendICPButton';

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
      <Card className="pt-4 pb-6" data-testid="available-balance-card">
        <CardHeader className="flex flex-col gap-0">
          <div className="flex min-h-9 w-full items-center justify-between">
            <p className="text-sm tracking-wide text-muted-foreground uppercase">
              {t(($) => $.account.available)}
            </p>
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

          <div className="flex flex-col gap-0.5">
            {balanceQuery.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-semibold">
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
            {IS_TESTNET && <GetTokens accountId={accountId} />}
            <Button asChild size="xl" className="w-full">
              <Link to="/dashboard" search={{ depositModal: true }} replace>
                <Plus aria-hidden="true" />
                {t(($) => $.account.addIcp)}
              </Link>
            </Button>
            <SendICPButton balance={balanceICP} />
          </div>
        </CardContent>
      </Card>
      <TransactionListDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
