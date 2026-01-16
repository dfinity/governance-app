import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { Lock, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { E8Sn, MILLISECONDS_IN_SECOND } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import {
  getDissolvingTimeInSeconds,
  getLockedTimeInSeconds,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolving,
} from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';
import { APY } from '@utils/staking-rewards';

type Props = {
  neuron: NeuronInfo;
  apy?: NonNullable<ReturnType<APY['neurons']['get']>>;
};

export const NeuronCard = ({ neuron, apy }: Props) => {
  const { t } = useTranslation();

  const isDissolving = getNeuronIsDissolving(neuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(neuron);

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
    <Card className="gap-3 transition-colors hover:border-foreground">
      <CardHeader className="flex flex-col items-start justify-between space-y-0 xs:flex-row">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.neuron.neuronId, { neuronId: neuron.neuronId })}
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {t(($) => $.neuron.creationDate, { date: creationDate })}
          </p>
        </div>
        {nonNullish(apy) && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-sm border p-2',
              apy.cur < apy.max
                ? 'border-orange-200 bg-orange-100 text-orange-600 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                : 'border-emerald-200 bg-emerald-100 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}
            onClick={(e) => {
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
            {/* apy.cur < apy.max && <CircleAlert className="hidden size-4 sm:block" /> */}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedAmount)}
            </p>
            <p className="text-[15px] font-semibold">
              {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.dissolveDelay)}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold capitalize">{durationText}</p>
              <div className="flex items-center gap-1 rounded-sm border border-gray-200 bg-gray-100 px-2 py-0.5 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                {isDissolving ? <Timer className="size-3" /> : <Lock className="size-3" />}
                <p className="text-[11px] font-medium">
                  {isDissolving ? t(($) => $.neuron.dissolving) : t(($) => $.neuron.locked)}
                </p>
              </div>
            </div>
          </div>

          {/* Staked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedMaturity)}
            </p>
            <p className="text-[15px] font-semibold">{formatNumber(stakedMaturity)}</p>
          </div>

          {/* Unstaked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.unstakedMaturity)}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[15px] font-semibold">{formatNumber(unstakedMaturity)}</p>
            </div>
          </div>

          {/* Maturity Mode */}
          <div className="flex items-center justify-between py-3">
            <p className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.maturityMode)}
            </p>
            <p className="text-[15px] font-semibold capitalize">
              {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
