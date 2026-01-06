import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { CircleAlert, Lock, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { E8Sn, MILISECONDS_IN_SECOND } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import {
  getDissolvingTimeInSeconds,
  getLockedTimeInSeconds,
  getNeuronIsAutoStakingMaturity,
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
        Number(neuron.fullNeuron.createdTimestampSeconds) * MILISECONDS_IN_SECOND,
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
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
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
            aria-role="button"
            className="flex items-center gap-2 rounded-sm border border-orange-200 bg-orange-100 p-2 text-orange-600 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
            onClick={(e) => {
              e.preventDefault();
              alert('@TODO: Implement optimization modal');
            }}
          >
            <span className="text-[13px] font-semibold">
              {formatPercentage(apy.cur)} {t(($) => $.common.apy)}
            </span>
            {apy.cur < apy.max && <CircleAlert className="size-4" />}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <span className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedAmount)}
            </span>
            <span className="text-[15px] font-semibold">
              {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <span className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.dissolveDelay)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold capitalize">{durationText}</span>
              <div className="flex items-center gap-1 rounded-sm border border-gray-200 bg-gray-100 px-2 py-0.5 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                {isDissolving ? <Timer className="size-3" /> : <Lock className="size-3" />}
                <span className="text-[11px] font-medium">
                  {isDissolving ? t(($) => $.neuron.dissolving) : t(($) => $.neuron.locked)}
                </span>
              </div>
            </div>
          </div>

          {/* Staked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <span className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.stakedMaturity)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-medium">{formatNumber(stakedMaturity)}</span>
            </div>
          </div>

          {/* Unstaked Maturity */}
          <div className="flex items-center justify-between border-b border-border/50 py-3">
            <span className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.unstakedMaturity)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-medium">{formatNumber(unstakedMaturity)}</span>
            </div>
          </div>

          {/* Maturity Mode */}
          <div className="flex items-center justify-between py-3">
            <span className="text-[13px] text-muted-foreground capitalize">
              {t(($) => $.neuron.maturityMode)}
            </span>
            <span className="text-[15px] font-semibold capitalize">
              {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
