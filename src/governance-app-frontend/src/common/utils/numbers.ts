export const isFiniteNonZeroNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value !== 0;
