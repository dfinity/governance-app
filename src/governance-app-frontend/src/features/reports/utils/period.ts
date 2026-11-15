export enum ReportPeriod {
  YearToDate = 'yearToDate',
  LastYear = 'lastYear',
  Custom = 'custom',
}

/** A time range in milliseconds since the epoch. `from` is inclusive and `to` is exclusive. */
export type ReportRange = {
  fromMs: number;
  toMs: number;
};

const DAY_MS = 24 * 60 * 60 * 1_000;

/** A `yyyy-mm-dd` date, as `<input type="date">` gives it. */
export type IsoDate = string;

const startOfUtcYear = (year: number): number => Date.UTC(year, 0, 1);

/** The UTC midnight at the start of the date, or `undefined` for an invalid date. */
const parseIsoDate = (date: IsoDate): number | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return undefined;

  const [, year, month, day] = match.map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);

  return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? ms : undefined;
};

export const toIsoDate = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10);

/** A custom range can be one year at most, as in the NNS dapp. */
export const isCustomRangeTooLong = ({ fromMs, toMs }: ReportRange): boolean => {
  const from = new Date(fromMs);
  const oneYearLater = Date.UTC(
    from.getUTCFullYear() + 1,
    from.getUTCMonth(),
    from.getUTCDate() + 1,
  );

  return toMs > oneYearLater;
};

/**
 * The range of a period, in UTC. A custom range includes the full `to` date.
 * Returns `undefined` when a custom date is missing or invalid, or when `to` is before `from`.
 */
export const getReportRange = ({
  period,
  customFrom,
  customTo,
  now,
}: {
  period: ReportPeriod;
  customFrom?: IsoDate;
  customTo?: IsoDate;
  now: number;
}): ReportRange | undefined => {
  const year = new Date(now).getUTCFullYear();

  switch (period) {
    case ReportPeriod.YearToDate:
      return { fromMs: startOfUtcYear(year), toMs: now };
    case ReportPeriod.LastYear:
      return { fromMs: startOfUtcYear(year - 1), toMs: startOfUtcYear(year) };
    case ReportPeriod.Custom: {
      const fromMs = parseIsoDate(customFrom ?? '');
      const toStartMs = parseIsoDate(customTo ?? '');
      if (fromMs === undefined || toStartMs === undefined || toStartMs < fromMs) return undefined;

      const toMs = Math.min(toStartMs + DAY_MS, now);
      return toMs > fromMs ? { fromMs, toMs } : undefined;
    }
  }
};
