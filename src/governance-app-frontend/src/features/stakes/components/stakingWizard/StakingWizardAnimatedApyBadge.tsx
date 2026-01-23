import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@components/Skeleton';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS, ICP_MIN_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { interpolateApyColor, isMaxApy } from '@utils/apy-colors';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

type Props = {
  value: number;
};

export function StakingWizardAnimatedApyBadge({ value }: Props) {
  const stakingRewards = useStakingRewards();

  if (!isStakingRewardDataReady(stakingRewards)) {
    return <Skeleton className="h-[34px] w-[180px]" />;
  }

  const minApy =
    stakingRewards.stakingFlowApyPreview[ICP_MIN_DISSOLVE_DELAY_MONTHS].nonAutoStake.dissolving *
    100;
  const maxApy =
    stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked * 100;

  return <AnimatedApyBadgeInner value={value} minApy={minApy} maxApy={maxApy} />;
}

type InnerProps = {
  value: number;
  minApy: number;
  maxApy: number;
};

function AnimatedApyBadgeInner({ value, minApy, maxApy }: InnerProps) {
  const { t } = useTranslation();

  const isMax = isMaxApy(value, maxApy);
  const normalizedPosition = Math.max(0, Math.min(1, (value - minApy) / (maxApy - minApy)));
  const springValue = useSpring(value, { stiffness: 100, damping: 20 });
  const displayValue = useTransform(springValue, (v) => `~${formatPercentage(v / 100)}`);

  const colorSpring = useSpring(normalizedPosition, { stiffness: 80, damping: 15 });
  const textColor = useTransform(colorSpring, (t) => interpolateApyColor(t));
  const bgColor = useTransform(colorSpring, (t) => interpolateApyColor(t, 0.1));
  const borderColor = useTransform(colorSpring, (t) => interpolateApyColor(t, 0.3));

  useEffect(() => {
    springValue.set(value);
    colorSpring.set(normalizedPosition);
  }, [springValue, colorSpring, value, normalizedPosition]);

  return (
    <motion.div
      className="inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5"
      style={{ backgroundColor: bgColor, borderWidth: 1, borderStyle: 'solid', borderColor }}
    >
      <span className="text-xs font-semibold text-gray-500 uppercase">
        {t(($) => $.stakeWizardModal.apyPreview.label)}:
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-bold">
        <motion.span style={{ color: textColor, width: '60px' }}>{displayValue}</motion.span>
        {isMax && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded bg-green-600 px-1 py-0.5 text-[10px] font-bold text-white uppercase"
          >
            {t(($) => $.common.max)}
          </motion.span>
        )}
      </span>
    </motion.div>
  );
}
