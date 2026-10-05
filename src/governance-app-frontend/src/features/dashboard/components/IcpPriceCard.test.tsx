import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { TickerPricesSource } from '@hooks/tickers';

import { IcpPriceCard } from './IcpPriceCard';

const mocks = vi.hoisted(() => ({
  tickerPrices: vi.fn(),
  rateHistory: vi.fn(),
}));

vi.mock('@hooks/tickers/useTickerPrices', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/tickers/useTickerPrices')>()),
  useTickerPrices: mocks.tickerPrices,
}));

vi.mock('@hooks/tickers/useIcpRateHistory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/tickers/useIcpRateHistory')>()),
  useIcpRateHistory: mocks.rateHistory,
}));

vi.mock('./IcpPriceSparkline', () => ({
  IcpPriceSparkline: () => <div data-testid="icp-price-sparkline" />,
}));

const POINTS = [
  { timestampSeconds: 1_774_784_400, usd: 3.435 },
  { timestampSeconds: 1_774_870_800, usd: 3.24 },
];

const mockTickerPrices = (source: TickerPricesSource) =>
  mocks.tickerPrices.mockReturnValue({
    tickerPrices: {
      isLoading: false,
      data: new Map([
        [CANISTER_ID_ICP_LEDGER!, { _name: 'ICP', icp: 1, usd: 3.24, previousUsd: 3.435 }],
      ]),
    },
    tickerPricesSource: source,
  });

const mockRateHistory = (data: typeof POINTS | undefined, isLoading = false) =>
  mocks.rateHistory.mockReturnValue({ data, isLoading });

describe('IcpPriceCard', () => {
  beforeEach(() => {
    mocks.tickerPrices.mockReset();
    mocks.rateHistory.mockReset();
  });

  it('shows the price, the 24h change, and the chart for the XRC source', () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);

    expect(screen.getByText('$3.24')).toBeTruthy();
    expect(screen.getByText(/5\.68%/)).toBeTruthy();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeTruthy();
    expect(mocks.rateHistory).toHaveBeenCalledWith({ enabled: true });
  });

  it('does not show the chart for the ICPSwap source', () => {
    mockTickerPrices(TickerPricesSource.ICP_SWAP);
    mockRateHistory(undefined);

    render(<IcpPriceCard />);

    expect(screen.getByText('$3.24')).toBeTruthy();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeNull();
    expect(mocks.rateHistory).toHaveBeenCalledWith({ enabled: false });
  });

  it('does not show the chart with fewer than two points', () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS.slice(0, 1));

    render(<IcpPriceCard />);

    expect(screen.getByText('$3.24')).toBeTruthy();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeNull();
  });

  it('shows the skeleton while the history loads', () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(undefined, true);

    render(<IcpPriceCard />);

    expect(screen.queryByText('$3.24')).toBeNull();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeNull();
  });
});
