import { MILLISECONDS_IN_SECOND } from '@constants/extra';

export const nowInSeconds = (): number => Math.round(Date.now() / 1000);

export const formatTimestampToLocalDate = (timestampSeconds: bigint | undefined): string => {
  if (!timestampSeconds) return '-';

  const date = new Date(Number(timestampSeconds) * MILLISECONDS_IN_SECOND);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);

export const getSessionTimeLeftForUi = (timeLeft: { minutes: number; seconds: number }) => ({
  minutes: timeLeft.minutes,
  seconds: timeLeft.seconds.toString().padStart(2, '0'),
});
