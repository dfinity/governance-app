import { describe, expect, it } from 'vitest';

import { FIAT_EXCHANGE_RATES_REFRESH_MS, FIAT_EXCHANGE_RATES_RETRY_MS } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';

import {
  getFiatExchangeRatesRefreshMs,
  parseFiatExchangeRatesResponse,
} from './useFiatExchangeRates';

const rate = (rate_e8s: bigint) => ({
  rate_e8s,
  timestamp_seconds: 1_774_828_800n,
  updated_at_seconds: 1_774_870_850n,
});

describe('parseFiatExchangeRatesResponse', () => {
  it('Converts the rates to units of each currency for one USD.', () => {
    const result = parseFiatExchangeRatesResponse([
      { symbol: 'EUR', rate: [rate(92_000_000n)] },
      { symbol: 'JPY', rate: [rate(15_012_000_000n)] },
    ]);

    expect(result).toEqual(
      new Map([
        ['EUR', 0.92],
        ['JPY', 150.12],
      ]),
    );
  });

  it('Skips the currencies without a rate and the zero rates.', () => {
    const result = parseFiatExchangeRatesResponse([
      { symbol: 'EUR', rate: [] },
      { symbol: 'GBP', rate: [rate(0n)] },
      { symbol: 'CHF', rate: [rate(88_000_000n)] },
    ]);

    expect(result).toEqual(new Map([['CHF', 0.88]]));
  });

  it('Returns an empty map for an empty response.', () => {
    expect(parseFiatExchangeRatesResponse([])).toEqual(new Map());
  });
});

describe('getFiatExchangeRatesRefreshMs', () => {
  it('Waits one hour if every currency has a rate.', () => {
    const rates = new Map(
      Object.values(FiatCurrency)
        .filter((currency) => currency !== FiatCurrency.USD)
        .map((currency) => [currency, 1]),
    );

    expect(getFiatExchangeRatesRefreshMs(rates)).toBe(FIAT_EXCHANGE_RATES_REFRESH_MS);
  });

  it('Retries sooner if a currency has no rate.', () => {
    expect(getFiatExchangeRatesRefreshMs(new Map([[FiatCurrency.EUR, 0.92]]))).toBe(
      FIAT_EXCHANGE_RATES_RETRY_MS,
    );
  });

  it('Retries sooner without a response.', () => {
    expect(getFiatExchangeRatesRefreshMs(undefined)).toBe(FIAT_EXCHANGE_RATES_RETRY_MS);
  });
});
