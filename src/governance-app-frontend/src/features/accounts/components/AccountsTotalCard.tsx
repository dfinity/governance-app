import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useTickerPrices } from '@hooks/tickers';
import { formatNumber, formatPercentage } from '@utils/numbers';

import { useAccounts } from '../hooks/useAccounts';
import { type AccountReady } from '../types';

const ACCOUNT_COLORS = [
  'var(--color-staking-ratio)',
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
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
  const { data: accountsState, isLoading, isLoadingBalances, totalBalanceIcp } = useAccounts();
  const accounts = accountsState?.accounts ?? [];

  const readyAccounts = accounts.filter((a): a is AccountReady => a.status === 'ready');
  const totalE8s = readyAccounts.reduce((sum, a) => sum + a.balanceE8s, 0n);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice && totalBalanceIcp ? formatNumber(totalBalanceIcp * icpPrice.usd) : '-';
  const loading = isLoading || isLoadingBalances;

  const segments = buildSegments(readyAccounts, totalE8s);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">
          {t(($) => $.accounts.totalAcrossAll)}
        </p>
        <div className="flex flex-col gap-0.5">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-2xl font-bold">
              {t(($) => $.common.inIcp, { value: formatNumber(totalBalanceIcp) })}
            </p>
          )}
          {loading || tickersQuery.isLoading ? (
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
