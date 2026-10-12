import { describe, expect, it } from 'vitest';

import { parseRateHistoryResponse } from './useIcpRateHistory';

describe('parseRateHistoryResponse', () => {
  it('Converts the rates to USD points in the same order.', () => {
    const result = parseRateHistoryResponse([
      { rate_e8s: 343_500_000n, timestamp_seconds: 1_774_784_400n, updated_at_seconds: 1n },
      { rate_e8s: 324_000_000n, timestamp_seconds: 1_774_870_800n, updated_at_seconds: 1n },
    ]);

    expect(result).toEqual([
      { timestampSeconds: 1_774_784_400, usd: 3.435 },
      { timestampSeconds: 1_774_870_800, usd: 3.24 },
    ]);
  });

  it('Skips zero rates.', () => {
    const result = parseRateHistoryResponse([
      { rate_e8s: 0n, timestamp_seconds: 1_774_784_400n, updated_at_seconds: 1n },
      { rate_e8s: 324_000_000n, timestamp_seconds: 1_774_870_800n, updated_at_seconds: 1n },
    ]);

    expect(result).toEqual([{ timestampSeconds: 1_774_870_800, usd: 3.24 }]);
  });

  it('Returns an empty list for an empty response.', () => {
    expect(parseRateHistoryResponse([])).toEqual([]);
  });
});
