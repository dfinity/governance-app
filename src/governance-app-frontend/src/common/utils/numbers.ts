import { isNullish, nonNullish } from '@dfinity/utils';

import { errorMessage } from './error';

export const isFiniteNonZeroNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value !== 0;

export const clampNumber = (args: {
  val: number | undefined;
  min?: number;
  max?: number;
}): number | undefined => {
  const { val, min, max } = args;

  if (nonNullish(min) && nonNullish(max) && min >= max) {
    throw errorMessage('getConstrainedNumber', 'min value must be less than max value');
  }

  if (isNullish(val) || Number.isNaN(val)) {
    return undefined;
  }

  if (nonNullish(min) && val < min) {
    return min;
  }

  if (nonNullish(max) && val > max) {
    return max;
  }

  return val;
};
