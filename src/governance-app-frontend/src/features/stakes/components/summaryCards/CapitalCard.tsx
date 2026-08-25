import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { SensitiveValue } from '@components/SensitiveValue';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

type CapitalCardProps = {
  neurons: NeuronInfo[];
};

export function CapitalCard({ neurons }: CapitalCardProps) {
  const { t } = useTranslation();

  const { tickerPrices: tickersQuery } = useTickerPrices();

  const { totalStakedAfterFees: totalStaked } = getNeuronsAggregatedData(neurons);

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? totalStaked * icpPrice.usd : null;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-capital-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.capital)}
        </p>
        {/* The staked total arrives with the neurons, so it never waits on the
            ticker price. Only the USD line below does. */}
        <p className="text-lg font-semibold text-foreground md:text-2xl">
          <SensitiveValue>
            {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
          </SensitiveValue>
        </p>
        <div className="mt-1 text-sm text-muted-foreground">
          {tickersQuery.isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <p>
              {nonNullish(usdValue) ? (
                <SensitiveValue size="sm">
                  {t(($) => $.account.approxUsd, {
                    value: formatNumber(usdValue, { minFraction: 2, maxFraction: 2 }),
                  })}
                </SensitiveValue>
              ) : (
                '—'
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
