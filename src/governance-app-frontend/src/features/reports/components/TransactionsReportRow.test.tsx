import '@/i18n/config';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportPeriod } from '../utils/period';
import { TransactionsReportRow } from './TransactionsReportRow';

const download = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
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

const nonFinalFile = { currency: 'EUR', fiatRatesFinalAtMs: Date.UTC(2026, 10, 18) };

/** Clicks the download, and the download gives `file`. */
const downloadFile = (file: typeof nonFinalFile) => {
  download.mutate.mockImplementationOnce((_, { onSuccess }) => act(() => onSuccess(file)));
  clickDownload();
};

describe('TransactionsReportRow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    download.mutate.mockReset();
    download.isPending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the year to date by default', () => {
    render(<TransactionsReportRow />);

    clickDownload();

    expect(download.mutate.mock.calls[0][0]).toEqual({
      period: ReportPeriod.YearToDate,
      range: { fromMs: Date.UTC(2026, 0, 1), toMs: NOW },
    });
  });

  it('shows the note after a download with non-final fiat values', () => {
    render(<TransactionsReportRow />);
    downloadFile(nonFinalFile);

    expect(screen.getByTestId('transactions-report-non-final-note').textContent).toBe(
      'The EUR values of the last days can still change. Download the report again after 00:00 UTC on Nov 18, 2026 at the earliest. In the new file, check the USD/EUR rate date of the last days. If it is earlier than the date of the row, or if this note shows again, try again a few hours later.',
    );
  });

  it('keeps the note of the last file when a retry fails', () => {
    render(<TransactionsReportRow />);
    downloadFile(nonFinalFile);
    clickDownload();

    expect(screen.getByTestId('transactions-report-non-final-note')).toBeTruthy();
  });

  it('removes the note of the last file when the range changes', () => {
    render(<TransactionsReportRow />);
    downloadFile(nonFinalFile);

    selectPeriod(ReportPeriod.LastYear);

    expect(screen.queryByTestId('transactions-report-non-final-note')).toBeNull();
  });

  it('locks the period while a download runs', () => {
    download.isPending = true;
    render(<TransactionsReportRow />);

    expect(screen.getByTestId<HTMLSelectElement>('transactions-report-period').disabled).toBe(true);
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
    expect(download.mutate.mock.calls[0][0]).toEqual({
      period: ReportPeriod.Custom,
      range: { fromMs: Date.UTC(2025, 6, 1), toMs: Date.UTC(2026, 6, 1) },
    });
  });
});
