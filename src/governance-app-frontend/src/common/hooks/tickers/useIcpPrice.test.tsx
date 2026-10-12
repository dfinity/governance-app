import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { FiatCurrency } from '@constants/fiat';

import { useIcpPrice } from './useIcpPrice';

const mocks = vi.hoisted(() => ({
  tickerPrices: vi.fn(),
  fiatExchangeRates: vi.fn(),
  fiatCurrency: vi.fn(),
}));

vi.mock('@hooks/useFiatCurrency', () => ({ useFiatCurrency: mocks.fiatCurrency }));

vi.mock('./useTickerPrices', () => ({ useTickerPrices: mocks.tickerPrices }));
vi.mock('./useFiatExchangeRates', () => ({ useFiatExchangeRates: mocks.fiatExchangeRates }));

const mockFiatCurrency = (fiatCurrency: FiatCurrency) =>
  mocks.fiatCurrency.mockReturnValue({ fiatCurrency, setFiatCurrency: vi.fn() });

const mockFiatExchangeRates = (data: Map<string, number> | undefined, isLoading = false) =>
  mocks.fiatExchangeRates.mockReturnValue({ data, isLoading });

describe('useIcpPrice', () => {
  beforeEach(() => {
    mocks.tickerPrices.mockReturnValue({
      tickerPrices: {
        isLoading: false,
        isError: false,
        data: new Map([[CANISTER_ID_ICP_LEDGER!, { _name: 'ICP', icp: 1, usd: 3.24 }]]),
      },
    });
    mockFiatCurrency(FiatCurrency.USD);
  });

  afterEach(() => {
    mocks.fiatExchangeRates.mockReset();
  });

  it('Gives the USD price without the exchange rates by default.', () => {
    mockFiatExchangeRates(undefined);

    const { result } = renderHook(() => useIcpPrice());

    expect(result.current.icpPrice).toBe(3.24);
    expect(result.current.currency).toBe(FiatCurrency.USD);
    expect(result.current.formatFiat(3.24)).toBe('$3.24');
    expect(mocks.fiatExchangeRates).toHaveBeenCalledWith({ enabled: false });
  });

  it('Converts the price to the picked currency.', () => {
    mockFiatCurrency(FiatCurrency.EUR);
    mockFiatExchangeRates(new Map([[FiatCurrency.EUR, 0.9]]));

    const { result } = renderHook(() => useIcpPrice());

    expect(result.current.icpPrice).toBeCloseTo(2.916);
    expect(result.current.currency).toBe(FiatCurrency.EUR);
    expect(result.current.toFiat(10)).toBe(9);
    expect(result.current.formatFiat(2.916)).toBe('€2.92');
    expect(mocks.fiatExchangeRates).toHaveBeenCalledWith({ enabled: true });
  });

  it('Falls back to USD if the picked currency has no rate.', () => {
    mockFiatCurrency(FiatCurrency.CHF);
    mockFiatExchangeRates(new Map([[FiatCurrency.EUR, 0.9]]));

    const { result } = renderHook(() => useIcpPrice());

    expect(result.current.icpPrice).toBe(3.24);
    expect(result.current.currency).toBe(FiatCurrency.USD);
  });

  it('Loads until the exchange rates arrive.', () => {
    mockFiatCurrency(FiatCurrency.EUR);
    mockFiatExchangeRates(undefined, true);

    const { result } = renderHook(() => useIcpPrice());

    expect(result.current.isLoading).toBe(true);
  });
});
