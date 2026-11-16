const ARC_CORNER_RADIUS = 10;

/**
 * The fill and the end caps of the staking ratio ring.
 * A ratio that rounds to 100% fills the ring with square ends, so the two rounded caps do not
 * leave a notch where they meet.
 */
export const getStakingRingArc = (stakingRatioPercent: number) => {
  const isFull = Math.round(stakingRatioPercent) >= 100;

  return {
    value: isFull ? 100 : stakingRatioPercent,
    cornerRadius: isFull ? 0 : ARC_CORNER_RADIUS,
  };
};
