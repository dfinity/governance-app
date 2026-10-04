import { MILLISECONDS_IN_SECOND, NANOSECONDS_IN_SECOND, SECONDS_IN_DAY } from '@constants/extra';

const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_MINUTE = 60;

export const nowInSeconds = (): number => Math.round(Date.now() / 1000);

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);

export const timestampInNanosToSeconds = (timestampNanos: bigint): bigint =>
  timestampNanos / BigInt(NANOSECONDS_IN_SECOND);

export const getSessionTimeLeftForUi = (timeLeft: { minutes: number; seconds: number }) => ({
  minutes: timeLeft.minutes,
  seconds: timeLeft.seconds.toString().padStart(2, '0'),
});

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

/** Splits a duration into the parts of a countdown. A negative duration gives all zeros. */
export const secondsToCountdownParts = (totalSeconds: number): CountdownParts => {
  const remaining = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(remaining / SECONDS_IN_DAY),
    hours: Math.floor((remaining % SECONDS_IN_DAY) / SECONDS_IN_HOUR),
    minutes: Math.floor((remaining % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE),
    seconds: remaining % SECONDS_IN_MINUTE,
  };
};

export const formatTimestampToLocalDate = (seconds: bigint | undefined): string => {
  if (!seconds) return '-';

  const date = new Date(Number(seconds) * MILLISECONDS_IN_SECOND);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Source: https://github.com/dfinity/nns-dapp/blob/c32c35d280aa5b5046cc46b1fe566193f8f7555b/frontend/src/lib/utils/date.utils.ts#L97
export const secondsToDate = (seconds: number): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const milliseconds = seconds * MILLISECONDS_IN_SECOND;
  // We only support english for now.
  return new Date(milliseconds).toLocaleDateString('en', options);
};

export const secondsToTime = (seconds: number): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeStyle: 'short',
  };
  const milliseconds = seconds * MILLISECONDS_IN_SECOND;
  // We only support english for now.
  return new Date(milliseconds).toLocaleTimeString('en', options);
};
