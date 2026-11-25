import { ProposalInfo, Tally, Topic } from '@icp-sdk/canisters/nns';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';

import type { _SERVICE } from '@declarations/dashboard-collector/dashboard-collector.did';

import { MILLISECONDS_IN_SECOND, SECONDS_IN_DAY } from '@constants/extra';

export type TallyHistory = Awaited<ReturnType<_SERVICE['getTallyHistory']>>;

// The collector's `recordingSince`: its first complete poll, on 2026-11-04 at 00:43:36 UTC.
export const TALLY_RECORDING_SINCE_SECONDS = 1_793_753_016;

// The collector reads governance every five minutes while a proposal takes votes.
export const TALLY_POLL_INTERVAL_MS = 5 * 60 * 1_000;

const MAX_DAY_TICKS = 6;
// A label this close to an edge of the axis would be cut, as a share of the axis.
const DAY_TICK_EDGE_RATIO = 0.08;

/**
 * Local midnights between the two times, one day apart or more, so that no date repeats and
 * no date is skipped without a constant step.
 */
export const getDayTicks = (startSeconds: number, endSeconds: number): number[] => {
  const span = endSeconds - startSeconds;
  if (span <= 0) return [];

  const stepDays = Math.max(1, Math.ceil(span / SECONDS_IN_DAY / MAX_DAY_TICKS));
  const margin = span * DAY_TICK_EDGE_RATIO;
  const day = new Date(startSeconds * MILLISECONDS_IN_SECOND);
  day.setHours(24, 0, 0, 0);

  const ticks: number[] = [];
  for (
    ;
    day.getTime() / MILLISECONDS_IN_SECOND < endSeconds;
    day.setDate(day.getDate() + stepDays)
  ) {
    const seconds = day.getTime() / MILLISECONDS_IN_SECOND;
    if (seconds - startSeconds >= margin && endSeconds - seconds >= margin) ticks.push(seconds);
  }
  return ticks;
};

export type TallyPoint = {
  timestampSeconds: number;
  // Shares of the total voting power, from 0 to 1.
  yes: number;
  no: number;
};

export type TallyChart = {
  points: TallyPoint[];
  // The proposal's creation and deadline.
  startSeconds: number;
  endSeconds: number;
};

/**
 * The value of the lines at each tick that they reach. A line holds a value until its next point.
 * When no tick falls inside the lines, the middle of the lines takes its place, so the lines
 * always carry a mark before their end.
 */
export const getMarkPoints = (points: TallyPoint[], ticks: number[]): TallyPoint[] => {
  const firstSeconds = points.at(0)?.timestampSeconds;
  const lastSeconds = points.at(-1)?.timestampSeconds;
  if (isNullish(firstSeconds) || isNullish(lastSeconds)) return [];

  const valueAt = (timestampSeconds: number): TallyPoint[] => {
    const point = points.findLast((point) => point.timestampSeconds <= timestampSeconds);
    return isNullish(point) ? [] : [{ ...point, timestampSeconds }];
  };

  const insideTicks = ticks.filter((seconds) => seconds >= firstSeconds && seconds <= lastSeconds);
  if (insideTicks.length > 0) return insideTicks.flatMap(valueAt);
  if (lastSeconds <= firstSeconds) return [];
  return valueAt((firstSeconds + lastSeconds) / 2);
};

// At the deadline, a proposal needs Yes votes of 3% of the total voting power or more.
export const QUORUM_SHARE = 0.03;
// Yes votes of more than half the total voting power decide a proposal before its deadline.
export const MAJORITY_SHARE = 0.5;

// The axis tops, smallest first. The smallest one keeps the quorum line in view.
const SHARE_AXES: { max: number; ticks: number[] }[] = [
  { max: 0.05, ticks: [0, 0.01, 0.02, 0.03, 0.04, 0.05] },
  { max: 0.1, ticks: [0, 0.02, 0.04, 0.06, 0.08, 0.1] },
  { max: 0.25, ticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25] },
  { max: 0.5, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5] },
  { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] },
];
// The highest line stays this far below the top of the axis, as a share of the axis.
const SHARE_AXIS_HEADROOM = 0.08;

/**
 * The smallest axis that holds the highest Yes or No share with some headroom. Shares only rise,
 * so the axis only grows while the proposal takes votes.
 */
export const getShareAxis = (points: TallyPoint[]): { max: number; ticks: number[] } => {
  const highest = Math.max(0, ...points.map(({ yes, no }) => Math.max(yes, no)));
  const fullAxis = SHARE_AXES[SHARE_AXES.length - 1];
  return SHARE_AXES.find(({ max }) => highest <= max * (1 - SHARE_AXIS_HEADROOM)) ?? fullAxis;
};

/**
 * The collector records only the proposals that took votes after it began to record.
 * Neuron Management proposals get no voting rewards, so it never sees them.
 */
export const hasTallyHistory = (proposal: ProposalInfo): boolean =>
  nonNullish(proposal.id) &&
  proposal.topic !== Topic.NeuronManagement &&
  Number(proposal.deadlineTimestampSeconds ?? 0n) >= TALLY_RECORDING_SINCE_SECONDS;

// A closed track never changes.
export const isTallyHistoryClosed = (history: TallyHistory | undefined): boolean => {
  const closedAt = fromNullable(history?.track ?? [])?.closedAt;
  return nonNullish(closedAt) && closedAt !== 0n;
};

/**
 * True while the track is open, and while a proposal with no track yet still takes votes: the
 * collector opens a track at its first poll after the proposal appears.
 */
export const shouldPollTallyHistory = ({
  history,
  proposal,
  nowSeconds,
}: {
  history: TallyHistory | undefined;
  proposal: ProposalInfo;
  nowSeconds: number;
}): boolean => {
  const track = fromNullable(history?.track ?? []);
  if (nonNullish(track)) return track.closedAt === 0n;
  return Number(proposal.deadlineTimestampSeconds ?? 0n) > nowSeconds;
};

// Wait for quiet can extend the deadline after the proposal was read, so take the latest one.
const getDeadlineSeconds = (proposal: ProposalInfo, track: { deadlines: { deadline: bigint }[] }) =>
  Math.max(
    Number(proposal.deadlineTimestampSeconds ?? 0n),
    ...track.deadlines.map(({ deadline }) => Number(deadline)),
  );

const toShares = ({ yes, no, total }: Pick<Tally, 'yes' | 'no' | 'total'>) => ({
  yes: Number(yes) / Number(total),
  no: Number(no) / Number(total),
});

/**
 * The recorded readings, then the proposal's latest tally when it holds more votes: the collector
 * skips changes under 0.1 point. The last value holds until the history was read, and never past
 * the deadline.
 */
export const toTallyChart = ({
  history,
  proposal,
  readAtSeconds,
}: {
  history: TallyHistory;
  proposal: ProposalInfo;
  readAtSeconds: number;
}): TallyChart | undefined => {
  const track = fromNullable(history.track);
  if (isNullish(track) || track.total === 0n) return undefined;

  const startSeconds = Number(proposal.proposalTimestampSeconds);
  const endSeconds = getDeadlineSeconds(proposal, track);
  if (endSeconds <= startSeconds) return undefined;

  const tallies = track.readings.map(({ t, yes, no }) => ({
    timestampSeconds: t,
    yes,
    no,
    total: track.total,
  }));
  // Stamps can move backwards, but Yes and No only rise, so the vote shares tell which is newer.
  const latestTally = proposal.latestTally;
  const lastReading = tallies.at(-1);
  if (nonNullish(latestTally) && latestTally.total > 0n) {
    const latest = toShares(latestTally);
    const last = nonNullish(lastReading) ? toShares(lastReading) : undefined;
    if (
      isNullish(last) ||
      (latest.yes >= last.yes &&
        latest.no >= last.no &&
        (latest.yes > last.yes || latest.no > last.no))
    ) {
      tallies.push(latestTally);
    }
  }
  if (tallies.length === 0) return undefined;

  let previousSeconds = startSeconds;
  const points = tallies.map((tally) => {
    // Yes and No only rise, so a stamp older than the one before it is drawn at that earlier time.
    // Governance counts no vote after the deadline, so no reading is drawn after it.
    const timestampSeconds = Math.min(
      Math.max(Number(tally.timestampSeconds), previousSeconds),
      endSeconds,
    );
    previousSeconds = timestampSeconds;
    return { timestampSeconds, ...toShares(tally) };
  });

  const last = points[points.length - 1];
  const holdUntilSeconds = Math.min(readAtSeconds, endSeconds);
  if (holdUntilSeconds > last.timestampSeconds) {
    points.push({ ...last, timestampSeconds: holdUntilSeconds });
  }

  return { points, startSeconds, endSeconds };
};
