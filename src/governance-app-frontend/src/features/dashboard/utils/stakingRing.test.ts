import { describe, expect, it } from 'vitest';

import { getStakingRingArc } from './stakingRing';

describe('getStakingRingArc', () => {
  it('keeps the rounded caps for a partial ring', () => {
    expect(getStakingRingArc(43.6)).toEqual({ value: 43.6, cornerRadius: 10 });
  });

  it('keeps the rounded caps when the ratio rounds to 99%', () => {
    expect(getStakingRingArc(99.4)).toEqual({ value: 99.4, cornerRadius: 10 });
  });

  it('closes the ring when the ratio rounds to 100%', () => {
    expect(getStakingRingArc(99.5)).toEqual({ value: 100, cornerRadius: 0 });
  });

  it('closes the ring at 100%', () => {
    expect(getStakingRingArc(100)).toEqual({ value: 100, cornerRadius: 0 });
  });
});
