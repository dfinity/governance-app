import { describe, expect, it } from 'vitest';

import { shortenId } from '@utils/id';

describe('shortenId', () => {
  it('should shorten a long string by keeping the specified length from each end', () => {
    expect(shortenId('abcdefghijklmnopqrstuvwxyz', 5)).toBe('abcde...vwxyz');
  });

  it('should return the original string when it is short enough', () => {
    expect(shortenId('abcdefghij', 5)).toBe('abcdefghij');
  });

  it('should work with different lengths', () => {
    expect(shortenId('1234567890abcdef', 3)).toBe('123...def');
    expect(shortenId('1234567890abcdef', 6)).toBe('123456...abcdef');
  });

  it('should handle an empty string', () => {
    expect(shortenId('', 5)).toBe('');
  });
});
