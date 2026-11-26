import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAIN } from '../utils/testUtils';
import { ReportTransactionType } from '../utils/transactionsCsv';
import { getYearPeriod, type YearSummary } from '../utils/yearSummary';
import { YearSummarySection } from './YearSummarySection';

const mocks = vi.hoisted(() => ({
  useYearSummary: vi.fn(),
  downloadCsv: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../hooks/useYearSummary', () => ({ useYearSummary: mocks.useYearSummary }));
vi.mock('../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/csv')>()),
  downloadCsv: mocks.downloadCsv,
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

const ICP = 100_000_000n;
const NOW = Date.UTC(2026, 10, 16);

const summary: YearSummary = {
  period: getYearPeriod(2025, NOW),
  rewards: [],
  rewardsTotalE8s: 0n,
  rewardsTotalHundredths: 0n,
  rewardsWithoutRate: 0,
  holdings: [{ entity: { kind: 'account', accountId: MAIN, name: 'Main' }, balanceE8s: 5n * ICP }],
  holdingsTotalE8s: 5n * ICP,
  holdingsRate: { dayMs: Date.UTC(2025, 11, 31), icpToFiatE8s: 3n * ICP },
  holdingsTotalHundredths: 1_500n,
  maturityE8s: undefined,
  receivedE8s: 5n * ICP,
  sentE8s: 0n,
  feesE8s: 0n,
  complete: true,
};

describe('YearSummarySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with the current year and loads a past year on a click', async () => {
    mocks.useYearSummary.mockReturnValue({ isPending: true });
    render(<YearSummarySection />);

    expect(mocks.useYearSummary).toHaveBeenLastCalledWith(2026);
    expect(screen.getByRole('radio', { name: '2026 to date' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: '2025' }));

    expect(mocks.useYearSummary).toHaveBeenLastCalledWith(2025);
  });

  it('shows the holdings at the end of a past year and downloads the CSV', async () => {
    mocks.useYearSummary.mockReturnValue({ isPending: false, isError: false, data: summary });
    render(<YearSummarySection />);

    expect(screen.getByTestId('year-summary-holdings').textContent).toContain(
      'Holdings on 31 Dec 2025',
    );
    expect(screen.getByText('No rewards in this period.')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Download CSV Year summary' }));

    expect(mocks.downloadCsv).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'year-summary-2025.csv' }),
    );
  });

  it('names the columns of the rewards table', () => {
    mocks.useYearSummary.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...summary,
        rewards: [
          {
            entity: { kind: 'account', accountId: MAIN, name: 'Main' },
            transaction: {
              id: 1n,
              timestampMs: Date.UTC(2025, 5, 1),
              type: ReportTransactionType.Reward,
              from: '',
              to: MAIN,
              amountE8s: ICP,
              feeE8s: undefined,
            },
            rate: undefined,
            valueHundredths: undefined,
          },
        ],
      },
    });
    render(<YearSummarySection />);

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Date (UTC)',
      'Account',
      'Amount (ICP)',
      'Value (USD)',
    ]);
  });

  it('shows no fiat reward income when a reward has no rate', () => {
    mocks.useYearSummary.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...summary, rewardsTotalE8s: 10n * ICP, rewardsWithoutRate: 1 },
    });
    render(<YearSummarySection />);

    const tile = screen.getByTestId('year-summary-rewards').textContent;
    expect(tile).toContain('-');
    expect(tile).toContain('10.00 ICP · 1 without a rate');
    expect(tile).not.toContain('€');
  });

  it('offers a retry after an error', async () => {
    mocks.useYearSummary.mockReturnValue({
      isPending: false,
      isError: true,
      refetch: mocks.refetch,
    });
    render(<YearSummarySection />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
