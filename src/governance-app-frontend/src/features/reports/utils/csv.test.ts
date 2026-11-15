import { describe, expect, it } from 'vitest';

import {
  asSpreadsheetText,
  buildCsv,
  formatE8sForCsv,
  formatUtcDate,
  formatUtcDateTime,
} from './csv';

describe('buildCsv', () => {
  it('writes a byte order mark, a header line, and CRLF line ends', () => {
    const csv = buildCsv(
      [
        { header: 'Name', value: (row: { name: string }) => row.name },
        { header: 'Length', value: (row: { name: string }) => String(row.name.length) },
      ],
      [{ name: 'Main' }],
    );

    expect(csv).toBe('﻿Name,Length\r\nMain,4\r\n');
  });

  it('quotes cells with a comma, a quote, or a line break', () => {
    const csv = buildCsv(
      [{ header: 'Name', value: (row: string) => row }],
      ['a,b', 'say "hi"', 'two\nlines'],
    );

    expect(csv).toBe('﻿Name\r\n"a,b"\r\n"say ""hi"""\r\n"two\nlines"\r\n');
  });
});

describe('formatE8sForCsv', () => {
  it.each([
    [0n, '0.00000000'],
    [1n, '0.00000001'],
    [150_000_000n, '1.50000000'],
    [123_456_789_012_345_678n, '1234567890.12345678'],
    [-10_000n, '-0.00010000'],
  ])('formats %s e8s as %s', (e8s, expected) => {
    expect(formatE8sForCsv(e8s)).toBe(expected);
  });

  it('adds a plus sign to a credit when asked', () => {
    expect(formatE8sForCsv(100_000_000n, { signed: true })).toBe('+1.00000000');
    expect(formatE8sForCsv(-100_000_000n, { signed: true })).toBe('-1.00000000');
    expect(formatE8sForCsv(0n, { signed: true })).toBe('0.00000000');
  });
});

describe('dates', () => {
  const ms = Date.UTC(2026, 10, 12, 14, 3, 22, 999);

  it('formats a UTC date and time', () => {
    expect(formatUtcDateTime(ms)).toBe('2026-11-12 14:03:22');
  });

  it('formats a UTC date', () => {
    expect(formatUtcDate(ms)).toBe('2026-11-12');
  });
});

describe('asSpreadsheetText', () => {
  it('wraps the value in a text formula', () => {
    expect(asSpreadsheetText('12345678901234567890')).toBe('="12345678901234567890"');
  });
});
