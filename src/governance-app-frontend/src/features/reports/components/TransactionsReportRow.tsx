import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@components/Input';
import { Label } from '@components/Label';
import { NativeSelect, NativeSelectOption } from '@components/NativeSelect';

import { useTransactionsReportDownload } from '../hooks/useReportDownloads';
import { getReportRange, isCustomRangeTooLong, ReportPeriod, toIsoDate } from '../utils/period';
import { ReportDownloadButton } from './ReportDownloadButton';

type RangeError = 'invalidRange' | 'rangeTooLong';

export const TransactionsReportRow = () => {
  const { t } = useTranslation();
  const titleId = useId();
  const download = useTransactionsReportDownload();
  const [period, setPeriod] = useState(ReportPeriod.YearToDate);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rangeError, setRangeError] = useState<RangeError>();

  const [today] = useState(() => toIsoDate(Date.now()));
  const periodLabels: Record<ReportPeriod, string> = {
    [ReportPeriod.YearToDate]: t(($) => $.reports.transactions.periods.yearToDate),
    [ReportPeriod.LastYear]: t(($) => $.reports.transactions.periods.lastYear),
    [ReportPeriod.Custom]: t(($) => $.reports.transactions.periods.custom),
  };
  const rangeErrorLabels: Record<RangeError, string> = {
    invalidRange: t(($) => $.reports.transactions.invalidRange),
    rangeTooLong: t(($) => $.reports.transactions.rangeTooLong),
  };

  const handleDownload = () => {
    const range = getReportRange({ period, customFrom, customTo, now: Date.now() });

    if (!range) return setRangeError('invalidRange');
    if (period === ReportPeriod.Custom && isCustomRangeTooLong(range)) {
      return setRangeError('rangeTooLong');
    }

    setRangeError(undefined);
    download.mutate({ range, period });
  };

  const handlePeriodChange = (value: ReportPeriod) => {
    setPeriod(value);
    setRangeError(undefined);
  };

  return (
    <div
      className="flex flex-col gap-y-4 md:flex-row md:items-end md:justify-between md:gap-x-6"
      data-testid="transactions-report-row"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <p id={titleId} className="leading-none font-medium">
            {t(($) => $.reports.transactions.title)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.reports.transactions.description)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transactions-report-period">
              {t(($) => $.reports.transactions.period)}
            </Label>
            <NativeSelect
              id="transactions-report-period"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as ReportPeriod)}
              className="sm:w-48"
              data-testid="transactions-report-period"
            >
              {Object.values(ReportPeriod).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {periodLabels[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {period === ReportPeriod.Custom && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transactions-report-from">
                  {t(($) => $.reports.transactions.from)}
                </Label>
                <Input
                  id="transactions-report-from"
                  type="date"
                  value={customFrom}
                  max={today}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-invalid={rangeError !== undefined}
                  className="sm:w-44"
                  data-testid="transactions-report-from"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transactions-report-to">
                  {t(($) => $.reports.transactions.to)}
                </Label>
                <Input
                  id="transactions-report-to"
                  type="date"
                  value={customTo}
                  max={today}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-invalid={rangeError !== undefined}
                  className="sm:w-44"
                  data-testid="transactions-report-to"
                />
              </div>
            </>
          )}
        </div>

        {rangeError && (
          <p
            role="alert"
            className="text-sm text-destructive"
            data-testid="transactions-report-error"
          >
            {rangeErrorLabels[rangeError]}
          </p>
        )}
      </div>

      <ReportDownloadButton
        titleId={titleId}
        onClick={handleDownload}
        isPending={download.isPending}
        testId="transactions-report-download-btn"
      />
    </div>
  );
};
