import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber, formatPercentage } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { type AccountReady } from '../types';

const ACCOUNT_COLORS = [
  'hsl(220, 70%, 55%)', // blue
  'hsl(160, 60%, 45%)', // teal
  'hsl(30, 75%, 55%)', // amber
  'hsl(280, 60%, 58%)', // purple
  'hsl(350, 65%, 55%)', // rose
  'hsl(85, 55%, 48%)', // olive green
  'hsl(195, 70%, 50%)', // sky
  'hsl(15, 70%, 55%)', // coral
];

function getAccountColor(index: number) {
  if (index < ACCOUNT_COLORS.length) return ACCOUNT_COLORS[index];
  const hue = (220 + index * 47) % 360;
  return `hsl(${Math.round(hue)}, 65%, 55%)`;
}

function buildSegments(readyAccounts: AccountReady[], totalE8s: bigint) {
  if (totalE8s === 0n) return [];
  return readyAccounts.map((account, index) => {
    const percentage = Number((account.balanceE8s * 10000n) / totalE8s) / 100;
    const color = getAccountColor(index);
    return { accountId: account.accountId, name: account.name, percentage, color };
  });
}

export const AccountsTotalCard = () => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery } = useTickerPrices();
  const { data: accountsState } = useAccounts();
  const accounts = accountsState?.accounts ?? [];

  const readyAccounts = accounts.filter((a): a is AccountReady => a.status === 'ready');
  const isLoadingBalances = accounts.length === 0 || accounts.some((a) => a.status === 'loading');
  const totalE8s = readyAccounts.reduce((sum, a) => sum + a.balanceE8s, 0n);
  const totalICP = bigIntDiv(totalE8s, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(totalICP * icpPrice.usd) : '-';

  const segments = buildSegments(readyAccounts, totalE8s);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">
          {t(($) => $.accounts.totalAcrossAll)}
        </p>
        <div className="flex flex-col gap-0.5">
          {isLoadingBalances ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-2xl font-bold">
              {t(($) => $.common.inIcp, { value: formatNumber(totalICP) })}
            </p>
          )}
          {isLoadingBalances || tickersQuery.isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(($) => $.account.approxUsd, { value: usdValue })}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isLoadingBalances ? (
          <Skeleton className="h-3 w-full rounded-full" />
        ) : (
          <div
            className="flex h-3 w-full overflow-hidden rounded-full"
            role="img"
            aria-label={t(($) => $.accounts.totalAcrossAll)}
          >
            {segments.map((seg) => (
              <div
                key={seg.accountId}
                className="transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
              />
            ))}
          </div>
        )}

        {isLoadingBalances ? (
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((seg) => (
              <div key={seg.accountId} className="flex items-center gap-1.5 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-muted-foreground">{seg.name}</span>
                <span className="font-medium">
                  {formatPercentage(seg.percentage / 100, { minFraction: 1, maxFraction: 1 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
