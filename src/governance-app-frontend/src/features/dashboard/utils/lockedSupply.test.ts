import { describe, expect, it } from 'vitest';

import { E8S } from '@constants/extra';

import { getLockedSupplyBreakdown } from './lockedSupply';

const icpToE8s = (icp: number) => icp * E8S;

const METRICS = {
  totalSupplyIcp: 1_000n,
  totalLockedE8s: BigInt(icpToE8s(600)),
  // Bucket 4 is the max dissolve delay of 2 years.
  notDissolvingNeuronsE8sBuckets: [
    [0n, icpToE8s(10)],
    [3n, icpToE8s(40)],
    [4n, icpToE8s(450)],
  ] as Array<[bigint, number]>,
  dissolvingNeuronsE8sBuckets: [
    [0n, icpToE8s(30)],
    [3n, icpToE8s(70)],
  ] as Array<[bigint, number]>,
};

describe('getLockedSupplyBreakdown', () => {
  it('splits the supply into the lock types', () => {
    expect(getLockedSupplyBreakdown(METRICS)).toEqual({
      totalSupply: 1_000,
      maxLock: 450,
      shorterLock: 50,
      dissolving: 100,
      notLocked: 400,
    });
  });

  it('counts the buckets above the max dissolve delay as max lock', () => {
    const breakdown = getLockedSupplyBreakdown({
      ...METRICS,
      notDissolvingNeuronsE8sBuckets: [
        [4n, icpToE8s(400)],
        [5n, icpToE8s(50)],
      ],
    });

    expect(breakdown?.maxLock).toBe(450);
  });

  it('makes the locked parts add up to the total locked', () => {
    const breakdown = getLockedSupplyBreakdown({
      ...METRICS,
      totalLockedE8s: BigInt(icpToE8s(620)),
    });

    expect(breakdown?.shorterLock).toBe(70);
    expect(breakdown?.notLocked).toBe(380);
  });

  it('does not return negative parts when the buckets exceed the total locked', () => {
    const breakdown = getLockedSupplyBreakdown({
      ...METRICS,
      totalLockedE8s: BigInt(icpToE8s(500)),
    });

    expect(breakdown).toEqual({
      totalSupply: 1_000,
      maxLock: 450,
      shorterLock: 0,
      dissolving: 50,
      notLocked: 500,
    });
  });

  it('returns undefined without a supply', () => {
    expect(getLockedSupplyBreakdown({ ...METRICS, totalSupplyIcp: 0n })).toBeUndefined();
  });
});
