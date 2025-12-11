export const nowInSeconds = (): number => Math.round(Date.now() / 1000);

export const nowInBigIntNanoSeconds = (): bigint => BigInt(Date.now()) * BigInt(1e6);
