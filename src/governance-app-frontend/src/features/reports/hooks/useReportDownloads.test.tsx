import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { ReportPeriod } from '../utils/period';
import { mintTx } from '../utils/testUtils';
import { mapReportTransaction, type ReportEntity } from '../utils/transactionsCsv';
import { useNeuronsReportDownload, useTransactionsReportDownload } from './useReportDownloads';

const mocks = vi.hoisted(() => ({
  loadReportNeurons: vi.fn(),
  loadNnsDappAccounts: vi.fn(),
  loadReportTransactions: vi.fn(),
  loadReportRates: vi.fn(),
  downloadCsv: vi.fn(),
  infoNotification: vi.fn(),
  warningNotification: vi.fn(),
  errorNotification: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('../utils/loadReportData', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/loadReportData')>()),
  loadReportNeurons: mocks.loadReportNeurons,
  loadNnsDappAccounts: mocks.loadNnsDappAccounts,
  loadReportTransactions: mocks.loadReportTransactions,
  loadReportRates: mocks.loadReportRates,
}));
vi.mock('@hooks/tickers/useIcpPrice', () => ({
  useIcpPrice: () => ({ icpPrice: 2.5, currency: 'USD' }),
}));
vi.mock('../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/csv')>()),
  downloadCsv: mocks.downloadCsv,
}));
vi.mock('@utils/notification', () => ({
  infoNotification: mocks.infoNotification,
  warningNotification: mocks.warningNotification,
  errorNotification: mocks.errorNotification,
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));
vi.mock('@hooks/useInternetIdentity', async () => {
  const { Ed25519KeyIdentity } = await import('@icp-sdk/core/identity');
  const identity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(2));
  return { useInternetIdentity: () => ({ identity }) };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const RANGE = { fromMs: Date.UTC(2026, 0, 1), toMs: Date.UTC(2026, 10, 15) };
const main: ReportEntity = { kind: 'account', accountId: 'main', name: 'Main' };
const reward = mapReportTransaction({
  entity: main,
  transaction: mintTx({ id: 1n, ms: Date.UTC(2026, 5, 1), to: 'main', e8s: 1n }),
  neuronAccountIds: new Set(),
  ownAccountIds: new Set(['main']),
});

const runTransactionsReport = async () => {
  const { result } = renderHook(() => useTransactionsReportDownload(), { wrapper });
  result.current.mutate({ range: RANGE, period: ReportPeriod.YearToDate });
  await waitFor(() => expect(result.current.isPending).toBe(false));
};

describe('useTransactionsReportDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadReportNeurons.mockResolvedValue([]);
    mocks.loadNnsDappAccounts.mockResolvedValue({ subAccounts: [], hardwareWallets: [] });
    mocks.loadReportRates.mockResolvedValue(() => ({
      dayMs: Date.UTC(2026, 5, 1),
      icpToFiatE8s: 300_000_000n,
    }));
  });

  it('downloads the transactions with the value of each one', async () => {
    mocks.loadReportTransactions.mockResolvedValue({
      results: [{ entity: main, transactions: [reward] }],
      complete: true,
    });

    await runTransactionsReport();

    expect(mocks.loadReportRates).toHaveBeenCalledWith({ range: RANGE, currency: 'USD' });
    expect(mocks.downloadCsv).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'transactions-2026-01-01-to-2026-11-14.csv' }),
    );
    const [{ content }] = mocks.downloadCsv.mock.calls[0];
    expect(content).toContain(',3.00000000,0.00,2026-06-01\r\n');
    expect(mocks.warningNotification).not.toHaveBeenCalled();
  });

  it('starts no transaction scan and saves no file when the rates fail to load', async () => {
    mocks.loadReportRates.mockRejectedValue(new Error('down'));

    await runTransactionsReport();

    expect(mocks.loadReportTransactions).not.toHaveBeenCalled();
    expect(mocks.downloadCsv).not.toHaveBeenCalled();
    expect(mocks.errorNotification).toHaveBeenCalledOnce();
  });

  it('downloads a truncated list with a warning', async () => {
    mocks.loadReportTransactions.mockResolvedValue({
      results: [{ entity: main, transactions: [reward] }],
      complete: false,
    });

    await runTransactionsReport();

    expect(mocks.downloadCsv).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'transactions-2026-01-01-to-2026-11-14-incomplete.csv' }),
    );
    expect(mocks.warningNotification).toHaveBeenCalledWith(
      expect.objectContaining({ persistent: true }),
    );
  });

  it('says that the period is empty when the fetch is complete', async () => {
    mocks.loadReportTransactions.mockResolvedValue({
      results: [{ entity: main, transactions: [] }],
      complete: true,
    });

    await runTransactionsReport();

    expect(mocks.downloadCsv).not.toHaveBeenCalled();
    expect(mocks.infoNotification).toHaveBeenCalledOnce();
    expect(mocks.warningNotification).not.toHaveBeenCalled();
  });

  it('warns instead of saying empty when the fetch is incomplete', async () => {
    mocks.loadReportTransactions.mockResolvedValue({
      results: [{ entity: main, transactions: [] }],
      complete: false,
    });

    await runTransactionsReport();

    expect(mocks.downloadCsv).not.toHaveBeenCalled();
    expect(mocks.infoNotification).not.toHaveBeenCalled();
    expect(mocks.warningNotification).toHaveBeenCalledOnce();
  });

  it('shows an error and saves no file when the load fails', async () => {
    mocks.loadReportTransactions.mockRejectedValue(new Error('down'));

    await runTransactionsReport();

    expect(mocks.downloadCsv).not.toHaveBeenCalled();
    expect(mocks.errorNotification).toHaveBeenCalledOnce();
  });
});

describe('useNeuronsReportDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadNnsDappAccounts.mockResolvedValue({ subAccounts: [], hardwareWallets: [] });
  });

  const runNeuronsReport = async () => {
    const { result } = renderHook(() => useNeuronsReportDownload(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  };

  it('downloads the neurons', async () => {
    mocks.loadReportNeurons.mockResolvedValue([mockNeuron()]);

    await runNeuronsReport();

    expect(mocks.downloadCsv).toHaveBeenCalledOnce();
    const [{ content }] = mocks.downloadCsv.mock.calls[0];
    expect(content).toContain('Stake value today (USD)');
  });

  it('saves no file without neurons', async () => {
    mocks.loadReportNeurons.mockResolvedValue([]);

    await runNeuronsReport();

    expect(mocks.downloadCsv).not.toHaveBeenCalled();
    expect(mocks.infoNotification).toHaveBeenCalledOnce();
  });
});
