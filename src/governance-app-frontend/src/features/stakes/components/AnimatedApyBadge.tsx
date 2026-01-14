import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { SkeletonLoader } from '@components/SkeletonLoader';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

type Props = {
  value: number;
};

export function AnimatedApyBadge({ value }: Props) {
  const stakingRewards = useStakingRewards();

  if (!isStakingRewardDataReady(stakingRewards)) {
    return <SkeletonLoader height={34} width={180} />;
  }

  const minApy = stakingRewards.stakingFlowApyPreview[6].nonAutoStake.dissolving * 100;
  const maxApy = stakingRewards.stakingFlowApyPreview[96].autoStake.locked * 100;

  return <AnimatedApyBadgeInner value={value} minApy={minApy} maxApy={maxApy} />;
}

type InnerProps = {
  value: number;
  minApy: number;
  maxApy: number;
};

// Presentation: pure component with no data fetching
function AnimatedApyBadgeInner({ value, minApy, maxApy }: InnerProps) {
  const { t } = useTranslation();

  const isMax = value.toFixed(2) === maxApy.toFixed(2);
  const normalizedPosition = Math.max(0, Math.min(1, (value - minApy) / (maxApy - minApy)));
  const springValue = useSpring(value, { stiffness: 100, damping: 20 });
  const displayValue = useTransform(springValue, (v) => `~${v.toFixed(2)}%`);

  const colorSpring = useSpring(normalizedPosition, { stiffness: 80, damping: 15 });
  const textColor = useTransform(colorSpring, (t) => interpolateColor(t));
  const bgColor = useTransform(colorSpring, (t) => interpolateColor(t, 0.1));
  const borderColor = useTransform(colorSpring, (t) => interpolateColor(t, 0.3));

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

// Color interpolation from orange to green based on APY position
// t is 0-1 (0 = min/orange, 1 = max/green), opacity controls transparency
function interpolateColor(t: number, opacity: number = 1): string {
  // Orange rgb(234, 88, 12) -> Green rgb(22, 163, 74)
  const r = Math.round(234 - 212 * t);
  const g = Math.round(88 + 75 * t);
  const b = Math.round(12 + 62 * t);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
