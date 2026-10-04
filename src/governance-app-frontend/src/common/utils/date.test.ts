import { describe, expect, it } from 'vitest';

import { SECONDS_IN_DAY } from '@constants/extra';

import { secondsToCountdownParts } from './date';

describe('secondsToCountdownParts', () => {
  it('splits a duration into days, hours, minutes and seconds', () => {
    expect(secondsToCountdownParts(2 * SECONDS_IN_DAY + 3 * 60 * 60 + 4 * 60 + 5)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it('drops the fraction of a second', () => {
    expect(secondsToCountdownParts(59.9)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 });
  });

  it('returns zeros for a duration in the past', () => {
    expect(secondsToCountdownParts(-10)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
