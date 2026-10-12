import { describe, expect, it } from 'vitest';

import { formatFiat, getFiatFractionDigits } from './numbers';

describe('formatFiat', () => {
  it('Puts the currency symbol before the number.', () => {
    expect(formatFiat(1234.5, 'USD')).toBe('$1’234.50');
    expect(formatFiat(1234.5, 'EUR')).toBe('€1’234.50');
    expect(formatFiat(1234.5, 'CAD')).toBe('CA$1’234.50');
  });

  it('Keeps the space after a currency code.', () => {
    expect(formatFiat(1234.5, 'CHF')).toBe('CHF 1’234.50');
  });

  it('Uses the decimals of the currency by default.', () => {
    expect(formatFiat(1234.5, 'JPY')).toBe('¥1’235');
  });

  it('Uses the decimals of the options.', () => {
    expect(formatFiat(1234.5, 'EUR', { minFraction: 0, maxFraction: 0 })).toBe('€1’235');
  });
});

describe('getFiatFractionDigits', () => {
  it('Returns the decimals of the smallest unit of the currency.', () => {
    expect(getFiatFractionDigits('EUR')).toBe(2);
    expect(getFiatFractionDigits('JPY')).toBe(0);
  });
});
