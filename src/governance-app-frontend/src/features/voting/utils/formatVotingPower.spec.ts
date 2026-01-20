import { describe, expect, it } from 'vitest';

import { formatVotingPower } from './formatVotingPower';

describe('formatVotingPower', () => {
  it('formats hundreds of millions correctly', () => {
    expect(formatVotingPower(100_000_000)).toBe('100M');
    expect(formatVotingPower(192_294_914)).toBe('192M');
  });

  it('formats tens of millions correctly', () => {
    expect(formatVotingPower(1_000_000)).toBe('1M');
    expect(formatVotingPower(1_100_000)).toBe('1.1M');
    expect(formatVotingPower(10_000_000)).toBe('10M'); // removal of .0
    expect(formatVotingPower(20_100_000)).toBe('20.1M');
  });

  it('formats hundreds of thousands correctly', () => {
    expect(formatVotingPower(100_000)).toBe('100K');
    expect(formatVotingPower(999_999)).toBe('999K');
  });

  it('formats tens of thousands correctly', () => {
    expect(formatVotingPower(1_100)).toBe('1.1K');
    expect(formatVotingPower(29_200)).toBe('29.2K');
  });

  it('formats small numbers correctly', () => {
    expect(formatVotingPower(0)).toBe('0');
    expect(formatVotingPower(500)).toBe('500');
    expect(formatVotingPower(999)).toBe('999');
  });

  describe('edge cases - truncation behavior', () => {
    it('truncates hundreds of millions at boundary', () => {
      expect(formatVotingPower(199_999_999)).toBe('199M');
    });

    it('truncates tens of millions at boundary', () => {
      expect(formatVotingPower(99_999_999)).toBe('99.9M');
    });

    it('truncates hundreds of thousands at boundary', () => {
      expect(formatVotingPower(999_999)).toBe('999K');
    });

    it('truncates thousands at boundary', () => {
      expect(formatVotingPower(99_999)).toBe('99.9K');
    });

    it('truncates small numbers at boundary', () => {
      expect(formatVotingPower(999)).toBe('999');
    });
  });
});
