import type { GovernanceCachedMetrics } from '@icp-sdk/canisters/nns';

import { E8S, E8Sn, SECONDS_IN_HALF_YEAR } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { bigIntDiv } from '@utils/bigInt';

/** The parts of the total ICP supply, in ICP. The parts add up to `totalSupply`. */
export type LockedSupplyBreakdown = {
  totalSupply: number;
  /** Not dissolving, at the max dissolve delay. */
  maxLock: number;
  /** Not dissolving, under the max dissolve delay. */
  shorterLock: number;
  dissolving: number;
  notLocked: number;
};

// The governance canister groups the stakes by floor(dissolve delay / 6 months).
const MAX_LOCK_BUCKET = BigInt(Math.floor(ICP_MAX_DISSOLVE_DELAY_SECONDS / SECONDS_IN_HALF_YEAR));

const sumBucketsIcp = (buckets: Array<[bigint, number]>, fromBucket = 0n) =>
  buckets.reduce((sum, [bucket, e8s]) => (bucket >= fromBucket ? sum + e8s : sum), 0) / E8S;

export const getLockedSupplyBreakdown = (
  metrics: Pick<
    GovernanceCachedMetrics,
    | 'totalSupplyIcp'
    | 'totalLockedE8s'
    | 'notDissolvingNeuronsE8sBuckets'
    | 'dissolvingNeuronsE8sBuckets'
  >,
): LockedSupplyBreakdown | undefined => {
  const totalSupply = Number(metrics.totalSupplyIcp);
  if (totalSupply <= 0) return undefined;

  const locked = Math.min(bigIntDiv(metrics.totalLockedE8s, E8Sn), totalSupply);
  const maxLock = Math.min(
    sumBucketsIcp(metrics.notDissolvingNeuronsE8sBuckets, MAX_LOCK_BUCKET),
    locked,
  );
  const dissolving = Math.min(sumBucketsIcp(metrics.dissolvingNeuronsE8sBuckets), locked - maxLock);

  return {
    totalSupply,
    maxLock,
    // The rest of the locked stake, so that the locked parts add up to the total locked.
    shorterLock: locked - maxLock - dissolving,
    dissolving,
    notLocked: totalSupply - locked,
  };
};
