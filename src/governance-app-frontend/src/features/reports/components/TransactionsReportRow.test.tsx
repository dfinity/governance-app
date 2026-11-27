import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportPeriod } from '../utils/period';
import { TransactionsReportRow } from './TransactionsReportRow';

const download = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  data: undefined as { currency: string; fiatRatesFinalAtMs: number | undefined } | undefined,
}));
vi.mock('../hooks/useReportDownloads', () => ({
  useTransactionsReportDownload: () => download,
}));

const NOW = Date.UTC(2026, 10, 15, 12);

const selectPeriod = (period: ReportPeriod) =>
  fireEvent.change(screen.getByTestId('transactions-report-period'), {
    target: { value: period },
  });

const setDates = (from: string, to: string) => {
  fireEvent.change(screen.getByTestId('transactions-report-from'), { target: { value: from } });
  fireEvent.change(screen.getByTestId('transactions-report-to'), { target: { value: to } });
};

const clickDownload = () => fireEvent.click(screen.getByTestId('transactions-report-download-btn'));

describe('TransactionsReportRow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    download.mutate.mockReset();
    download.reset.mockReset();
    download.data = undefined;
    download.isPending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the year to date by default', () => {
    render(<TransactionsReportRow />);

    clickDownload();

    expect(download.mutate).toHaveBeenCalledWith({
      period: ReportPeriod.YearToDate,
      range: { fromMs: Date.UTC(2026, 0, 1), toMs: NOW },
    });
  });

  it('shows the note after a download with non-final fiat values', () => {
    download.data = { currency: 'EUR', fiatRatesFinalAtMs: Date.UTC(2026, 10, 18) };
    render(<TransactionsReportRow />);

    expect(screen.getByTestId('transactions-report-non-final-note').textContent).toBe(
      'The EUR values of the last days can still change. Download the report again after 00:00 UTC on Nov 18, 2026.',
    );
  });

  it('locks the period while a download runs', () => {
    download.isPending = true;
    render(<TransactionsReportRow />);

    expect(screen.getByTestId<HTMLSelectElement>('transactions-report-period').disabled).toBe(true);
  });

  it('removes the note of the last file when the range changes', () => {
    render(<TransactionsReportRow />);
    expect(screen.queryByTestId('transactions-report-non-final-note')).toBeNull();

    selectPeriod(ReportPeriod.Custom);
    setDates('2026-01-01', '2026-02-01');

    expect(download.reset).toHaveBeenCalledTimes(3);
  });

  it('names the download button after the report', () => {
    render(<TransactionsReportRow />);

    expect(screen.getByRole('button', { name: 'Download CSV Transactions' })).toBeTruthy();
  });

  it('shows the date fields only for a custom period', () => {
    render(<TransactionsReportRow />);
    expect(screen.queryByTestId('transactions-report-from')).toBeNull();

    selectPeriod(ReportPeriod.Custom);

    expect(screen.getByLabelText('From')).toBeTruthy();
    expect(screen.getByLabelText('To')).toBeTruthy();
  });

  it('asks for valid dates before a custom download', () => {
    render(<TransactionsReportRow />);
    selectPeriod(ReportPeriod.Custom);

    clickDownload();

    expect(screen.getByRole('alert').textContent).toContain('Select a start date and an end date');
    expect(download.mutate).not.toHaveBeenCalled();
  });

  it('rejects a custom period longer than one year', () => {
    render(<TransactionsReportRow />);
    selectPeriod(ReportPeriod.Custom);
    setDates('2025-01-01', '2026-01-02');

    clickDownload();

    expect(screen.getByRole('alert').textContent).toContain('one year at most');
    expect(download.mutate).not.toHaveBeenCalled();
  });

  it('downloads a valid custom period and clears the error', () => {
    render(<TransactionsReportRow />);
    selectPeriod(ReportPeriod.Custom);
    clickDownload();
    setDates('2025-07-01', '2026-06-30');

    clickDownload();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(download.mutate).toHaveBeenCalledWith({
      period: ReportPeriod.Custom,
      range: { fromMs: Date.UTC(2025, 6, 1), toMs: Date.UTC(2026, 6, 1) },
    });
  });
});
