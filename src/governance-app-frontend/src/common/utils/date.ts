import { MILLISECONDS_IN_SECOND } from '@constants/extra';

export const nowInSeconds = (): number => Math.round(Date.now() / 1000);

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);

export const timestampInNanosToSeconds = (timestampNanos: bigint): bigint =>
  timestampNanos / BigInt(1e9);

export const getSessionTimeLeftForUi = (timeLeft: { minutes: number; seconds: number }) => ({
  minutes: timeLeft.minutes,
  seconds: timeLeft.seconds.toString().padStart(2, '0'),
});

export const formatTimestampToLocalDate = (timestampSeconds: bigint | undefined): string => {
  if (!timestampSeconds) return '-';

  const date = new Date(Number(timestampSeconds) * MILLISECONDS_IN_SECOND);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const secondsToDate = (seconds: number): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const milliseconds = seconds * 1000;
  // We only support english for now.
  return new Date(milliseconds).toLocaleDateString('en', options);
};

export const secondsToTime = (seconds: number): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeStyle: 'short',
  };
  const milliseconds = seconds * 1000;
  // We only support english for now.
  return new Date(milliseconds).toLocaleTimeString('en', options);
};
