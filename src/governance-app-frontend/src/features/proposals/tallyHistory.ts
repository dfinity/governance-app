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
 * The collector records only the proposals that took votes after it began to record.
 * Neuron Management proposals get no voting rewards, so it never sees them.
 */
export const hasTallyHistory = (proposal: ProposalInfo): boolean =>
  nonNullish(proposal.id) &&
  proposal.topic !== Topic.NeuronManagement &&
  Number(proposal.deadlineTimestampSeconds ?? 0n) >= TALLY_RECORDING_SINCE_SECONDS;

export const isTallyHistoryOpen = (history: TallyHistory | undefined): boolean =>
  fromNullable(history?.track ?? [])?.closedAt === 0n;

const toShares = ({ yes, no, total }: Pick<Tally, 'yes' | 'no' | 'total'>) => ({
  yes: Number(yes) / Number(total),
  no: Number(no) / Number(total),
});

/**
 * The recorded readings, then the proposal's latest tally, which can be newer: the collector skips
 * changes under 0.1 point. The last value holds until now, or until the deadline once it passed.
 */
export const toTallyChart = ({
  history,
  proposal,
  nowSeconds,
}: {
  history: TallyHistory;
  proposal: ProposalInfo;
  nowSeconds: number;
}): TallyChart | undefined => {
  const track = fromNullable(history.track);
  if (isNullish(track) || track.total === 0n) return undefined;

  const startSeconds = Number(proposal.proposalTimestampSeconds);
  const endSeconds = Number(
    proposal.deadlineTimestampSeconds ?? track.deadlines.at(-1)?.deadline ?? 0n,
  );
  if (endSeconds <= startSeconds) return undefined;

  const tallies = track.readings.map(({ t, yes, no }) => ({
    timestampSeconds: t,
    yes,
    no,
    total: track.total,
  }));
  const latestTally = proposal.latestTally;
  const lastReadingSeconds = tallies.at(-1)?.timestampSeconds ?? 0n;
  if (
    nonNullish(latestTally) &&
    latestTally.total > 0n &&
    latestTally.timestampSeconds > lastReadingSeconds
  ) {
    tallies.push(latestTally);
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
  const holdUntilSeconds = Math.min(nowSeconds, endSeconds);
  if (holdUntilSeconds > last.timestampSeconds) {
    points.push({ ...last, timestampSeconds: holdUntilSeconds });
  }

  return { points, startSeconds, endSeconds };
};
