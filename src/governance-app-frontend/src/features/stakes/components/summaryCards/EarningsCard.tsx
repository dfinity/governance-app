import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApyOptimizationModal } from '@features/stakes/components/ApyOptimizationModal';
import { useLedgerSignerPrincipals } from '@features/stakes/hooks/useNeuronSigner';
import { getNeuronOptimizationIssues } from '@features/stakes/utils/getNeuronOptimizationIssues';

import { Card, CardContent } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { ForecastPeriod } from '@constants/forecast';
import { FORECAST_ESTIMATE_PERIOD, useForecastPeriod } from '@hooks/useForecastPeriod';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronIsDissolved, getNeuronsAggregatedData, isUserHotkeyOnly } from '@utils/neuron';
import { formatNumber, formatSmallAmount } from '@utils/numbers';
import { cn } from '@utils/shadcn';
import { isStakingRewardDataError, isStakingRewardDataReady } from '@utils/staking-rewards';

import {
  CARD_ACTION_CHEVRON_CLASS,
  CARD_ACTION_CLASS,
  CLICKABLE_CARD_CLASS,
  CLICKABLE_CARD_HOVER_CLASS,
} from './clickableCard';

type EarningsCardProps = {
  neurons: NeuronInfo[];
};

/**
 * Shows the maturity and the forecast for the period that the user picked. If a neuron that the
 * user can change can get a higher maturity rate, the whole card opens the
 * optimization modal. Dissolved neurons are left out, because the capital card
 * offers to disburse them. Hotkey-only neurons are left out, because a hotkey cannot
 * change their settings; a neuron that a usable Ledger device controls stays in.
 */
export function EarningsCard({ neurons }: EarningsCardProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText();
  const ledgerPrincipals = useLedgerSignerPrincipals();

  const stakingRewards = useStakingRewards();
  const { forecastPeriod } = useForecastPeriod();

  const { totalMaturity } = getNeuronsAggregatedData(neurons);

  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);
  const stakingRewardsError = isStakingRewardDataError(stakingRewards);
  const forecastValue = stakingRewardsReady
    ? (stakingRewards.rewardEstimates.get(FORECAST_ESTIMATE_PERIOD[forecastPeriod]) ?? 0)
    : null;

  const getForecastText = (value: number) => {
    const formatted = formatSmallAmount(value);
    switch (forecastPeriod) {
      case ForecastPeriod.Week:
        return t(($) => $.neuron.summary.earningsPerWeek, { value: formatted });
      case ForecastPeriod.Month:
        return t(($) => $.neuron.summary.earningsPerMonth, { value: formatted });
      case ForecastPeriod.Year:
        return t(($) => $.neuron.summary.earningsPerYear, { value: formatted });
    }
  };

  const canIncrease = neurons.some(
    (neuron) =>
      !getNeuronIsDissolved(neuron) &&
      !isUserHotkeyOnly({ neuron, principalId, ledgerPrincipals }) &&
      getNeuronOptimizationIssues(neuron).length > 0,
  );

  return (
    <Card
      className={cn(
        'gap-3 py-4',
        canIncrease && [CLICKABLE_CARD_CLASS, CLICKABLE_CARD_HOVER_CLASS],
      )}
      data-testid="stakes-summary-earnings-card"
    >
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.earnings)}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-foreground md:text-2xl">
            {formatNumber(totalMaturity)}
          </span>
          {/* Keeps the symbol above the card action cover. */}
          <MaturitySymbol className="relative z-10" />
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted-foreground">
          {stakingRewardsReady && forecastValue !== null ? (
            <p>{getForecastText(forecastValue)}</p>
          ) : stakingRewardsError ? (
            <p>—</p>
          ) : (
            <Skeleton className="h-5 w-24" />
          )}
          {canIncrease && (
            <ApyOptimizationModal
              trigger={
                <button
                  type="button"
                  className={cn(CARD_ACTION_CLASS, 'text-muted-foreground')}
                  data-card-action
                  data-testid="earnings-card-increase-action"
                >
                  {t(($) => $.neuron.summary.increase)}&nbsp;
                  <ChevronRight className={CARD_ACTION_CHEVRON_CLASS} />
                </button>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
