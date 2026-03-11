import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { useSubaccounts } from '../hooks/useSubaccounts';
import type { Subaccount } from '../types';

const MAX_PREVIEW_ACCOUNTS = 3;

export const SubaccountsCard = () => {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useSubaccounts();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const totalE8s = accounts?.reduce((sum, a) => sum + a.balanceE8s, 0n) ?? 0n;
  const totalICP = bigIntDiv(totalE8s, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(totalICP * icpPrice.usd) : '-';
  const count = accounts?.length ?? 0;

  const topAccounts = accounts?.slice(0, MAX_PREVIEW_ACCOUNTS) ?? [];

  return (
    <Card data-testid="accounts-card">
      <CardHeader className="flex flex-col gap-0">
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">
            {t(($) => $.accounts.title)}
          </p>
          {isLoading ? (
            <Skeleton className="h-5 w-5 rounded-full" />
          ) : (
            <Badge variant="outline">{count}</Badge>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-2xl font-bold">
              {t(($) => $.common.inIcp, { value: formatNumber(totalICP) })}
            </p>
          )}

          {isLoading || tickersQuery.isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(($) => $.account.approxUsd, { value: usdValue })}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        {isLoading ? (
          <div className="flex flex-col divide-y">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          topAccounts.length > 0 && <AccountPreviewList accounts={topAccounts} />
        )}

        <div className="mt-auto">
          <Button asChild size="xl" className="w-full">
            <Link to="/accounts">
              <Wallet aria-hidden="true" />
              {t(($) => $.accounts.viewAll)}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

function AccountPreviewList({ accounts }: { accounts: Subaccount[] }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col divide-y">
      {accounts.map((account) => {
        const balanceICP = bigIntDiv(account.balanceE8s, E8Sn);
        return (
          <div key={account.accountId} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">{account.name}</span>
            <span className="font-medium">
              {t(($) => $.common.inIcp, { value: formatNumber(balanceICP) })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
