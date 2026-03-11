import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import type { Subaccount } from '../types';

const BASE_COLOR = 'var(--color-staking-ratio)';
const OPACITY_MAX = 80;
const OPACITY_MIN = 15;

function getAccountColor(index: number, total: number) {
  if (total <= 1) return `color-mix(in srgb, ${BASE_COLOR} ${OPACITY_MAX}%, transparent)`;
  const opacity = OPACITY_MAX - (index / (total - 1)) * (OPACITY_MAX - OPACITY_MIN);
  return `color-mix(in srgb, ${BASE_COLOR} ${Math.round(opacity)}%, transparent)`;
}

type Props = {
  accounts: Subaccount[];
  isLoading: boolean;
};

export const AccountsTotalCard = ({ accounts, isLoading }: Props) => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const totalE8s = accounts.reduce((sum, a) => sum + a.balanceE8s, 0n);
  const totalICP = bigIntDiv(totalE8s, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(totalICP * icpPrice.usd) : '-';

  const segments = useMemo(() => {
    if (totalE8s === 0n) return [];
    const nonMainAccounts = accounts.filter((a) => !a.isMain);
    return accounts.map((account) => {
      const percentage = Number((account.balanceE8s * 10000n) / totalE8s) / 100;
      const color = account.isMain
        ? BASE_COLOR
        : getAccountColor(nonMainAccounts.indexOf(account), nonMainAccounts.length);
      return { name: account.name, percentage, color };
    });
  }, [accounts, totalE8s]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">
          {t(($) => $.accounts.totalAcrossAll)}
        </p>
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

      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-3 w-full rounded-full" />
        ) : (
          <div
            className="flex h-3 w-full overflow-hidden rounded-full"
            role="img"
            aria-label={t(($) => $.accounts.totalAcrossAll)}
          >
            {segments.map((seg) => (
              <div
                key={seg.name}
                className="transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
              />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((seg) => (
              <div key={seg.name} className="flex items-center gap-1.5 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-muted-foreground">{seg.name}</span>
                <span className="font-medium">
                  {t(($) => $.accounts.ofTotal, { value: formatNumber(seg.percentage, { minFraction: 1, maxFraction: 1 }) })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
