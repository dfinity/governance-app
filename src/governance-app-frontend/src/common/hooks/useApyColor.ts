import { ICP_MAX_DISSOLVE_DELAY_MONTHS, STAKING_APY_PREVIEW_MIN_MONTHS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getApyColors, getApyNormalizedPosition, isMaxApy } from '@utils/apy-colors';
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
    stakingRewards.stakingFlowApyPreview[STAKING_APY_PREVIEW_MIN_MONTHS].nonAutoStake.dissolving;
  const maxApy =
    stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked;

  const normalizedPosition = getApyNormalizedPosition(apyValue, minApy, maxApy);
  const colors = getApyColors(normalizedPosition);
  const isMax = isMaxApy(apyValue, maxApy);

  return {
    ready: true,
    ...colors,
    isMax,
    normalizedPosition,
    minApy,
    maxApy,
  };
}
