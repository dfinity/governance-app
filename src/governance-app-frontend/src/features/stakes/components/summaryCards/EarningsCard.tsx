import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApyOptimizationModal } from '@features/stakes/components/ApyOptimizationModal';
import { getNeuronOptimizationIssues } from '@features/stakes/utils/getNeuronOptimizationIssues';

import { Card, CardContent } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronIsDissolved, getNeuronsAggregatedData, isUserHotkey } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';
import {
  isStakingRewardDataError,
  isStakingRewardDataReady,
  MaturityEstimatePeriod,
} from '@utils/staking-rewards';

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
 * Shows the maturity and the forecast for the next year. If a neuron that the
 * user can change can get a higher maturity rate, the whole card opens the
 * optimization modal. Dissolved neurons are left out, because the capital card
 * offers to disburse them. Hotkey neurons are left out, because a hotkey cannot
 * change their settings.
 */
export function EarningsCard({ neurons }: EarningsCardProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText();

  const stakingRewards = useStakingRewards();

  const { totalMaturity } = getNeuronsAggregatedData(neurons);

  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);
  const stakingRewardsError = isStakingRewardDataError(stakingRewards);
  const forecastValue = stakingRewardsReady
    ? (stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)
    : null;

  const canIncrease = neurons.some(
    (neuron) =>
      !getNeuronIsDissolved(neuron) &&
      !isUserHotkey({ neuron, principalId }) &&
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
            <p>
              {t(($) => $.neuron.summary.earningsPerYear, {
                value: formatNumber(forecastValue),
              })}
            </p>
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
