import { ProposalInfo, Topic } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import {
  getDayTicks,
  hasTallyHistory,
  isTallyHistoryOpen,
  TALLY_RECORDING_SINCE_SECONDS,
  TallyHistory,
  toTallyChart,
} from './tallyHistory';

const CREATED = 1_000_000;
const DEADLINE = CREATED + 4 * 86_400;
const TOTAL = 1_000n;

const proposal = (overrides: Partial<ProposalInfo> = {}) =>
  ({
    id: 1n,
    topic: Topic.IcOsVersionDeployment,
    proposalTimestampSeconds: BigInt(CREATED),
    deadlineTimestampSeconds: BigInt(DEADLINE),
    latestTally: undefined,
    ...overrides,
  }) as ProposalInfo;

const history = ({
  readings = [],
  closedAt = 0n,
  total = TOTAL,
}: {
  readings?: [number, bigint, bigint][];
  closedAt?: bigint;
  total?: bigint;
} = {}): TallyHistory => ({
  recordingSince: BigInt(TALLY_RECORDING_SINCE_SECONDS),
  outages: [],
  track: [
    {
      total,
      firstReadAt: BigInt(CREATED),
      closedAt,
      finalRead: false,
      refused: 0n,
      deadlines: [{ at: BigInt(CREATED), deadline: BigInt(DEADLINE) }],
      readings: readings.map(([t, yes, no]) => ({ t: BigInt(t), yes, no })),
      next: [],
    },
  ],
});

describe('hasTallyHistory', () => {
  const recorded = BigInt(TALLY_RECORDING_SINCE_SECONDS);

  it('is true for a proposal that took votes after the recording began', () => {
    expect(hasTallyHistory(proposal({ deadlineTimestampSeconds: recorded }))).toBe(true);
  });

  it('is false for a proposal that closed before the recording began', () => {
    expect(hasTallyHistory(proposal({ deadlineTimestampSeconds: recorded - 1n }))).toBe(false);
  });

  it('is false for Neuron Management proposals, which the collector never records', () => {
    expect(
      hasTallyHistory(
        proposal({ topic: Topic.NeuronManagement, deadlineTimestampSeconds: recorded }),
      ),
    ).toBe(false);
  });

  it('is false without an ID or a deadline', () => {
    expect(hasTallyHistory(proposal({ id: undefined, deadlineTimestampSeconds: recorded }))).toBe(
      false,
    );
    expect(hasTallyHistory(proposal({ deadlineTimestampSeconds: undefined }))).toBe(false);
  });
});

describe('isTallyHistoryOpen', () => {
  it('is true while the track is open', () => {
    expect(isTallyHistoryOpen(history())).toBe(true);
  });

  it('is false once the track closed, or with no track', () => {
    expect(isTallyHistoryOpen(history({ closedAt: 5n }))).toBe(false);
    expect(isTallyHistoryOpen({ ...history(), track: [] })).toBe(false);
    expect(isTallyHistoryOpen(undefined)).toBe(false);
  });
});

describe('toTallyChart', () => {
  const afterDeadline = DEADLINE + 3_600;

  it('returns shares of the total, from the creation to the deadline', () => {
    const chart = toTallyChart({
      history: history({
        readings: [
          [CREATED + 60, 4n, 0n],
          [CREATED + 300, 937n, 1n],
        ],
      }),
      proposal: proposal(),
      nowSeconds: afterDeadline,
    });

    expect(chart).toEqual({
      startSeconds: CREATED,
      endSeconds: DEADLINE,
      points: [
        { timestampSeconds: CREATED + 60, yes: 0.004, no: 0 },
        { timestampSeconds: CREATED + 300, yes: 0.937, no: 0.001 },
        { timestampSeconds: DEADLINE, yes: 0.937, no: 0.001 },
      ],
    });
  });

  it('holds the last value until now while the proposal takes votes', () => {
    const chart = toTallyChart({
      history: history({ readings: [[CREATED + 60, 500n, 0n]] }),
      proposal: proposal(),
      nowSeconds: CREATED + 7_200,
    });

    expect(chart?.points.map(({ timestampSeconds }) => timestampSeconds)).toEqual([
      CREATED + 60,
      CREATED + 7_200,
    ]);
  });

  it('ends on the latest tally when it is newer than the last reading', () => {
    const chart = toTallyChart({
      history: history({ readings: [[CREATED + 60, 500n, 0n]] }),
      proposal: proposal({
        latestTally: {
          timestampSeconds: BigInt(CREATED + 600),
          yes: 509n,
          no: 2n,
          total: TOTAL,
        },
      }),
      nowSeconds: CREATED + 600,
    });

    expect(chart?.points).toEqual([
      { timestampSeconds: CREATED + 60, yes: 0.5, no: 0 },
      { timestampSeconds: CREATED + 600, yes: 0.509, no: 0.002 },
    ]);
  });

  it('ignores a latest tally that is not newer than the last reading', () => {
    const chart = toTallyChart({
      history: history({ readings: [[CREATED + 60, 500n, 0n]] }),
      proposal: proposal({
        latestTally: { timestampSeconds: BigInt(CREATED + 60), yes: 1n, no: 0n, total: TOTAL },
      }),
      nowSeconds: CREATED + 60,
    });

    expect(chart?.points).toEqual([{ timestampSeconds: CREATED + 60, yes: 0.5, no: 0 }]);
  });

  it('draws a reading with an older stamp at the time of the reading before it', () => {
    const chart = toTallyChart({
      history: history({
        readings: [
          [CREATED + 600, 500n, 0n],
          [CREATED + 300, 600n, 0n],
        ],
      }),
      proposal: proposal(),
      nowSeconds: CREATED + 600,
    });

    expect(chart?.points.map(({ timestampSeconds }) => timestampSeconds)).toEqual([
      CREATED + 600,
      CREATED + 600,
    ]);
  });

  it('draws no reading after the deadline', () => {
    const chart = toTallyChart({
      history: history({ readings: [[afterDeadline, 900n, 10n]], closedAt: 1n }),
      proposal: proposal(),
      nowSeconds: afterDeadline,
    });

    expect(chart?.points).toEqual([{ timestampSeconds: DEADLINE, yes: 0.9, no: 0.01 }]);
  });

  it('returns undefined without a track, a total, or a reading', () => {
    const args = { proposal: proposal(), nowSeconds: CREATED };

    expect(toTallyChart({ history: { ...history(), track: [] }, ...args })).toBeUndefined();
    expect(toTallyChart({ history: history({ total: 0n }), ...args })).toBeUndefined();
    expect(toTallyChart({ history: history(), ...args })).toBeUndefined();
  });

  it('returns undefined when the deadline is not after the creation', () => {
    expect(
      toTallyChart({
        history: history({ readings: [[CREATED, 1n, 0n]] }),
        proposal: proposal({ deadlineTimestampSeconds: BigInt(CREATED) }),
        nowSeconds: CREATED,
      }),
    ).toBeUndefined();
  });
});

describe('getDayTicks', () => {
  const DAY = 86_400;
  const isLocalMidnight = (seconds: number) => {
    const date = new Date(seconds * 1_000);
    return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
  };
  // 2026-11-04 at 12:00 local time.
  const start = new Date(2026, 10, 4, 12).getTime() / 1_000;

  it('puts one tick on each local midnight of a four-day vote', () => {
    const ticks = getDayTicks(start, start + 4 * DAY);

    expect(ticks).toHaveLength(4);
    expect(ticks.every(isLocalMidnight)).toBe(true);
    expect(ticks.map((seconds) => new Date(seconds * 1_000).getDate())).toEqual([5, 6, 7, 8]);
  });

  it('keeps a constant step of whole days and at most six ticks on a long vote', () => {
    const ticks = getDayTicks(start, start + 12 * DAY);

    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks.every(isLocalMidnight)).toBe(true);
    const days = ticks.map((seconds) => new Date(seconds * 1_000).getDate());
    expect(new Set(days.slice(1).map((day, index) => day - days[index])).size).toBe(1);
  });

  it('drops a midnight too close to an edge of the axis', () => {
    const nearMidnight = new Date(2026, 10, 4, 23, 30).getTime() / 1_000;

    expect(getDayTicks(nearMidnight, nearMidnight + 4 * DAY)[0]).toBeGreaterThan(
      nearMidnight + DAY,
    );
  });

  it('returns no tick for an empty span', () => {
    expect(getDayTicks(start, start)).toEqual([]);
  });
});
