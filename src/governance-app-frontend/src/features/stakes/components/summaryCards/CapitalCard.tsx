import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useGovernanceNeurons } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

export function CapitalCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const neurons = neuronsQuery.data?.response ?? [];
  const { totalStakedAfterFees: totalStaked } = getNeuronsAggregatedData(neurons);

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? totalStaked * icpPrice.usd : null;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-capital-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.capital)}
        </p>
        {neuronsQuery.isLoading || tickersQuery.isLoading ? (
          <>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-foreground">
              {usdValue !== null
                ? `≈ $${formatNumber(usdValue, { minFraction: 2, maxFraction: 2 })}`
                : '—'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
