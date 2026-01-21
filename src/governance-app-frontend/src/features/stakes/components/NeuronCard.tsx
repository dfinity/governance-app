import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { AlertTriangle, CheckCircle, CircleAlert, Coins, Lock, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { E8Sn, MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useApyColor } from '@hooks/useApyColor';
import { bigIntDiv } from '@utils/bigInt';
import {
  getDissolvingTimeInSeconds,
  getLockedTimeInSeconds,
  getNeuronFreeMaturityE8s,
  getNeuronHasNoFollowing,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
} from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { APY } from '@utils/staking-rewards';

type Props = {
  neuron: NeuronInfo;
  apy?: NonNullable<ReturnType<APY['neurons']['get']>>;
};

export const NeuronCard = ({ neuron, apy }: Props) => {
  const { t } = useTranslation();
  const apyColor = useApyColor(apy?.cur ?? 0);

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(neuron);
  const hasNoFollowing = getNeuronHasNoFollowing(neuron);
  const hasUnstakedMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;

  const dissolveDelaySeconds = isDissolving
    ? getDissolvingTimeInSeconds(neuron)
    : getLockedTimeInSeconds(neuron);

  const durationText = secondsToDuration({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const creationDate = neuron.fullNeuron?.createdTimestampSeconds
    ? new Date(
        Number(neuron.fullNeuron.createdTimestampSeconds) * MILLISECONDS_IN_SECOND,
      ).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

  const stakedMaturity = neuron.fullNeuron?.stakedMaturityE8sEquivalent
    ? bigIntDiv(neuron.fullNeuron.stakedMaturityE8sEquivalent, E8Sn)
    : 0;

  const unstakedMaturity = neuron.fullNeuron?.maturityE8sEquivalent
    ? bigIntDiv(neuron.fullNeuron.maturityE8sEquivalent, E8Sn)
    : 0;

  const stakedAmount = neuron.fullNeuron?.cachedNeuronStake
    ? bigIntDiv(neuron.fullNeuron.cachedNeuronStake, E8Sn)
    : 0;

  return (
    <Card className="gap-3 transition-colors hover:border-foreground" data-testid="neuron-card">
      <CardHeader className="flex flex-col items-start justify-between space-y-0 xs:flex-row">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.neuron.neuronId, { neuronId: neuron.neuronId })}
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {t(($) => $.neuron.creationDate, { date: creationDate })}
          </p>
        </div>
        {nonNullish(apy) && apyColor.ready && (
          <div
            className="flex items-center gap-2 rounded-sm border p-2"
            style={{
              backgroundColor: apyColor.bgColor,
              borderColor: apyColor.borderColor,
              color: apyColor.textColor,
            }}
            onClick={() => {
              // @TODO: Implement optimization modal
              // e.preventDefault();
              // e.stopPropagation();
            }}
            role="button"
            tabIndex={0}
            aria-label="Optimize neuron APY"
          >
            <p className="text-[13px] font-semibold">
              {formatPercentage(apy.cur)}{' '}
              <span className="hidden sm:inline">{t(($) => $.common.apy)} </span>
            </p>
            {apyColor.isMax ? (
              <span className="rounded bg-green-600 px-1 py-0.5 text-[10px] font-bold text-white uppercase">
                {t(($) => $.common.max)}
              </span>
            ) : (
              <CircleAlert className="hidden size-4 sm:block" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedAmount)}
            </p>
            <p className="text-[15px] font-semibold" data-testid="neuron-card-staked-amount">
              {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.dissolveDelay)}
            </p>
            <div className="flex items-center gap-2">
              <p
                className="text-[15px] font-semibold capitalize"
                data-testid="neuron-card-dissolve-delay"
              >
                {durationText}
              </p>
              <div
                className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 ${
                  isDissolving
                    ? 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}
                data-testid="neuron-card-state"
              >
                {isDissolved ? (
                  <CheckCircle className="size-3" />
                ) : isDissolving ? (
                  <Timer className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
                <p className="text-[11px] font-medium">
                  {isDissolved
                    ? t(($) => $.neuron.dissolved)
                    : isDissolving
                      ? t(($) => $.neuron.dissolving)
                      : t(($) => $.neuron.locked)}
                </p>
              </div>
            </div>
          </div>

          {/* Staked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedMaturity)}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[15px] font-semibold">{formatNumber(stakedMaturity)}</p>
              <MaturitySymbol />
            </div>
          </div>

          {/* Unstaked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.unstakedMaturity)}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[15px] font-semibold">{formatNumber(unstakedMaturity)}</p>
              <MaturitySymbol />
            </div>
          </div>

          {/* Maturity Mode */}
          <div className="flex items-center justify-between py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.maturityMode)}
            </p>
            <p
              className="text-[15px] font-semibold capitalize"
              data-testid="neuron-card-maturity-mode"
            >
              {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
            </p>
          </div>

          {/* @TODO: Remove when advanced following is implemented */}
          {hasNoFollowing && (
            <div
              className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              data-testid="neuron-card-no-following-warning"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <p className="text-[13px]">{t(($) => $.neuron.noFollowingWarning)}</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Disburse buttons */}
      {(isDissolved || hasUnstakedMaturity) && (
        <CardFooter className="flex flex-col gap-2 border-t pt-4">
          {isDissolved && (
            <Button
              variant="default"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                // @TODO: Implement DisburseIcpModal
              }}
              data-testid="neuron-card-disburse-icp-btn"
            >
              <Coins className="size-4" />
              {t(($) => $.neuron.disburseIcp)}
            </Button>
          )}
          {hasUnstakedMaturity && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                // @TODO: Implement DisburseMaturityModal
              }}
              data-testid="neuron-card-disburse-maturity-btn"
            >
              <Coins className="size-4" />
              {t(($) => $.neuron.disburseMaturity)}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
