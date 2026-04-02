import type { IcpExchangeRateResponse } from '@declarations/governance-app-backend/governance-app-backend.did';

export const fixture_ExchangeRate: IcpExchangeRateResponse = {
  current: [
    {
      rate_e8s: 1_000_000_000n,
      timestamp_seconds: 0n,
      updated_at_seconds: 0n,
    },
  ],
  one_day_ago: [
    {
      rate_e8s: 900_000_000n,
      timestamp_seconds: 0n,
      updated_at_seconds: 0n,
    },
  ],
};
