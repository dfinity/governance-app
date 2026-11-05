import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { FiatCurrency } from '@constants/fiat';
import { TickerPricesSource } from '@hooks/tickers';

import { IcpPriceCard } from './IcpPriceCard';

const mocks = vi.hoisted(() => ({
  tickerPrices: vi.fn(),
  rateHistory: vi.fn(),
  rateMonthHistory: vi.fn(),
  fiatExchangeRates: vi.fn(),
  fiatCurrency: vi.fn(),
}));

vi.mock('@hooks/useFiatCurrency', () => ({ useFiatCurrency: mocks.fiatCurrency }));

vi.mock('@hooks/tickers/useTickerPrices', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/tickers/useTickerPrices')>()),
  useTickerPrices: mocks.tickerPrices,
}));

vi.mock('@hooks/tickers/useIcpRateHistory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/tickers/useIcpRateHistory')>()),
  useIcpRateHistory: mocks.rateHistory,
  useIcpRateMonthHistory: mocks.rateMonthHistory,
}));

vi.mock('@hooks/tickers/useFiatExchangeRates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/tickers/useFiatExchangeRates')>()),
  useFiatExchangeRates: mocks.fiatExchangeRates,
}));

vi.mock('./IcpPriceSparkline', () => ({
  IcpPriceSparkline: ({ points, label }: { points: unknown[]; label: string }) => (
    <div data-testid="icp-price-sparkline" data-point-count={points.length} aria-label={label} />
  ),
}));

const POINTS = [
  { timestampSeconds: 1_774_784_400, usd: 3.435 },
  { timestampSeconds: 1_774_870_800, usd: 3.24 },
];

const NEWEST_SECONDS = 1_774_870_800;
const MONTH_POINTS = [
  { timestampSeconds: NEWEST_SECONDS - 30 * 86_400, usd: 4.05 },
  { timestampSeconds: NEWEST_SECONDS - 7 * 86_400, usd: 2.7 },
  { timestampSeconds: NEWEST_SECONDS, usd: 3.2 },
];

const mockTickerPrices = (source: TickerPricesSource, withChange = true) =>
  mocks.tickerPrices.mockReturnValue({
    tickerPrices: {
      isLoading: false,
      data: new Map([
        [
          CANISTER_ID_ICP_LEDGER!,
          { _name: 'ICP', icp: 1, usd: 3.24, previousUsd: withChange ? 3.435 : undefined },
        ],
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
    mocks.rateMonthHistory.mockReset();
    mocks.rateMonthHistory.mockReturnValue({ data: MONTH_POINTS, isLoading: false });
    mocks.fiatExchangeRates.mockReturnValue({ data: undefined, isLoading: false });
    mocks.fiatCurrency.mockReturnValue({ fiatCurrency: FiatCurrency.USD });
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

  it('shows the chart without the 24h change', () => {
    mockTickerPrices(TickerPricesSource.XRC, false);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);

    expect(screen.queryByText(/\(24h\)/)).toBeNull();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeTruthy();
  });

  it('shows the last 7 days of the month history for the 7d range', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /7 days/ }));

    // From 2.70 to the live price of 3.24.
    expect(screen.getByText(/20\.00%/).textContent).toContain('▲');
    expect(screen.getByText(/\(7d\)/)).toBeTruthy();
    const chart = screen.getByTestId('icp-price-sparkline');
    expect(chart.getAttribute('data-point-count')).toBe('2');
    expect(chart.getAttribute('aria-label')).toBe('ICP price over the last 7 days');
  });

  it('shows the chart without the change while the history is shorter than the range', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);
    mocks.rateMonthHistory.mockReturnValue({
      data: [
        { timestampSeconds: NEWEST_SECONDS - 8 * 86_400, usd: 2.7 },
        { timestampSeconds: NEWEST_SECONDS, usd: 3.2 },
      ],
      isLoading: false,
    });

    render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /30 days/ }));

    expect(screen.queryByText(/\(30d\)/)).toBeNull();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeTruthy();
  });

  it('accepts a history that misses the oldest rate of the range', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);
    mocks.rateMonthHistory.mockReturnValue({
      data: [
        { timestampSeconds: NEWEST_SECONDS - 7 * 86_400 + 2 * 3_600, usd: 2.7 },
        { timestampSeconds: NEWEST_SECONDS, usd: 3.2 },
      ],
      isLoading: false,
    });

    render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /7 days/ }));

    expect(screen.getByText(/\(7d\)/)).toBeTruthy();
  });

  it('shows the whole month history for the 30d range', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /30 days/ }));

    // From 4.05 to the live price of 3.24.
    expect(screen.getByText(/20\.00%/).textContent).toContain('▼');
    expect(screen.getByText(/\(30d\)/)).toBeTruthy();
    const chart = screen.getByTestId('icp-price-sparkline');
    expect(chart.getAttribute('data-point-count')).toBe('3');
    expect(chart.getAttribute('aria-label')).toBe('ICP price over the last 30 days');
  });

  it('fetches the month history only for the 7d and 30d ranges', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);
    expect(mocks.rateMonthHistory).toHaveBeenLastCalledWith({ enabled: false });

    await userEvent.click(screen.getByRole('radio', { name: /7 days/ }));
    expect(mocks.rateMonthHistory).toHaveBeenLastCalledWith({ enabled: true });
  });

  it('keeps the range when the user presses the selected range again', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /24 hours/ }));

    expect(screen.getByText(/\(24h\)/)).toBeTruthy();
  });

  it('goes back to the 24h change when the price source falls back to ICPSwap', async () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    const { rerender } = render(<IcpPriceCard />);
    await userEvent.click(screen.getByRole('radio', { name: /7 days/ }));
    expect(screen.getByText(/\(7d\)/)).toBeTruthy();

    mockTickerPrices(TickerPricesSource.ICP_SWAP);
    rerender(<IcpPriceCard />);

    expect(screen.queryByText(/\(7d\)/)).toBeNull();
    expect(screen.getByText(/5\.68%/).textContent).toContain('(24h)');
  });

  it('does not show the range picker for the ICPSwap source', () => {
    mockTickerPrices(TickerPricesSource.ICP_SWAP);
    mockRateHistory(undefined);

    render(<IcpPriceCard />);

    expect(screen.queryByRole('radio')).toBeNull();
    expect(mocks.rateMonthHistory).toHaveBeenCalledWith({ enabled: false });
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

  it('shows the price while the history loads', () => {
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(undefined, true);

    render(<IcpPriceCard />);

    expect(screen.getByText('$3.24')).toBeTruthy();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeNull();
  });

  it('shows the price in the picked currency', () => {
    mocks.fiatCurrency.mockReturnValue({ fiatCurrency: FiatCurrency.EUR });
    mocks.fiatExchangeRates.mockReturnValue({
      data: new Map([[FiatCurrency.EUR, 0.9]]),
      isLoading: false,
    });
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);

    expect(screen.getByText('€2.92')).toBeTruthy();
    expect(screen.getByText(/5\.68%/)).toBeTruthy();
  });

  it('does not show the chart while the exchange rate loads', () => {
    mocks.fiatCurrency.mockReturnValue({ fiatCurrency: FiatCurrency.EUR });
    mocks.fiatExchangeRates.mockReturnValue({ data: undefined, isLoading: true });
    mockTickerPrices(TickerPricesSource.XRC);
    mockRateHistory(POINTS);

    render(<IcpPriceCard />);

    expect(screen.queryByText('$3.24')).toBeNull();
    expect(screen.queryByTestId('icp-price-sparkline')).toBeNull();
  });
});
