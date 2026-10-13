import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { SensitiveValue } from '@components/SensitiveValue';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { useIcpPrice } from '@hooks/tickers';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

type CapitalCardProps = {
  neurons: NeuronInfo[];
};

export function CapitalCard({ neurons }: CapitalCardProps) {
  const { t } = useTranslation();

  const { icpPrice, formatFiat, isLoading: isIcpPriceLoading } = useIcpPrice();

  const { totalStakedAfterFees: totalStaked } = getNeuronsAggregatedData(neurons);

  const fiatValue = nonNullish(icpPrice) ? totalStaked * icpPrice : null;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-capital-card">
      <CardContent>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mb-2 block w-fit cursor-default text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t(($) => $.neuron.summary.capital)}{' '}
              <span className="sr-only">{t(($) => $.neuron.summary.capitalTooltip)}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{t(($) => $.neuron.summary.capitalTooltip)}</TooltipContent>
        </Tooltip>
        {/* The staked total arrives with the neurons, so it never waits on the
            ticker price. Only the fiat line below does. */}
        <p className="text-lg font-semibold text-foreground md:text-2xl">
          <SensitiveValue>
            {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
          </SensitiveValue>
        </p>
        <div className="mt-1 text-sm text-muted-foreground">
          {isIcpPriceLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <p>
              {nonNullish(fiatValue) ? (
                <SensitiveValue size="sm">
                  {t(($) => $.account.approxFiat, { value: formatFiat(fiatValue) })}
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
