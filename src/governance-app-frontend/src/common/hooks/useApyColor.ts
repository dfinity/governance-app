import { ICP_MAX_DISSOLVE_DELAY_MONTHS, ICP_MIN_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getApyColors, getApyNormalizedPosition } from '@utils/apy-colors';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

type ApyColorResult =
  | { ready: false }
  | {
      ready: true;
      textColor: string;
      bgColor: string;
      borderColor: string;
      isMax: boolean;
      normalizedPosition: number;
      minApy: number;
      maxApy: number;
    };

export function useApyColor(apyValue: number): ApyColorResult {
  const stakingRewards = useStakingRewards();

  if (!isStakingRewardDataReady(stakingRewards)) {
    return { ready: false };
  }

  const minApy =
    stakingRewards.stakingFlowApyPreview[ICP_MIN_DISSOLVE_DELAY_MONTHS].nonAutoStake.dissolving;
  const maxApy =
    stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked;

  const normalizedPosition = getApyNormalizedPosition(apyValue, minApy, maxApy);
  const colors = getApyColors(normalizedPosition);
  const isMax = apyValue.toFixed(2) === maxApy.toFixed(2);

  return {
    ready: true,
    ...colors,
    isMax,
    normalizedPosition,
    minApy,
    maxApy,
  };
}
