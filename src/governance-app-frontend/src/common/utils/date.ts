export const nowInSeconds = (): number => Math.round(Date.now() / 1000);

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);

export const getSessionTimeLeftForUi = (timeLeft: { minutes: number; seconds: number }) => ({
  minutes: timeLeft.minutes,
  seconds: timeLeft.seconds.toString().padStart(2, '0'),
});
