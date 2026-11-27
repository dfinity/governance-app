import { ChevronDown, Info } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { SensitiveValue } from '@components/SensitiveValue';
import { E8Sn } from '@constants/extra';
import type { FiatCurrency } from '@constants/fiat';
import { bigIntDiv } from '@utils/bigInt';
import { formatFiat, formatNumber } from '@utils/numbers';

import { useYearSummaryCsvLabels, useYearSummaryLimits } from '../hooks/useReportCsvLabels';
import { downloadCsv } from '../utils/csv';
import type { YearSummary } from '../utils/yearSummary';
import { buildYearSummaryCsv } from '../utils/yearSummaryCsv';
import { NonFinalRatesNote } from './NonFinalRatesNote';
import { ReportDownloadButton } from './ReportDownloadButton';

const utcDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatIcp = (e8s: bigint, maxFraction = 2): string =>
  formatNumber(bigIntDiv(e8s, E8Sn), { minFraction: 2, maxFraction });

/** An ICP amount with a sign, but no sign for zero. */
const formatSigned = (e8s: bigint, sign: '+' | '−'): string =>
  `${e8s > 0n ? sign : ''}${formatIcp(e8s)}`;

const formatHundredths = (hundredths: bigint, currency: FiatCurrency): string =>
  formatFiat(Number(hundredths) / 100, currency);

type Props = {
  summary: YearSummary;
  currency: FiatCurrency;
  /** The ID of the section title, which completes the accessible name of the download button. */
  sectionTitleId: string;
};

export const YearSummaryContent = ({ summary, currency, sectionTitleId }: Props) => {
  const { t } = useTranslation();
  const titleId = useId();
  const limits = useYearSummaryLimits();
  const csvLabels = useYearSummaryCsvLabels({ currency, period: summary.period });
  const { period } = summary;

  const holdingsLabel = period.isCurrentYear
    ? t(($) => $.reports.yearSummary.holdingsToday)
    : t(($) => $.reports.yearSummary.holdingsOn, {
        date: utcDateFormat.format(period.toMs - 1),
      });
  const holdingsDetail =
    summary.maturityE8s === undefined
      ? t(($) => $.reports.yearSummary.noMaturity, { icp: formatIcp(summary.holdingsTotalE8s) })
      : t(($) => $.reports.yearSummary.withMaturity, {
          icp: formatIcp(summary.holdingsTotalE8s),
          maturity: formatIcp(summary.maturityE8s),
        });

  const handleDownload = () => {
    downloadCsv({
      fileName: t(($) => $.reports.yearSummary.fileName, { year: period.year }),
      content: buildYearSummaryCsv({ summary, currency, labels: csvLabels }),
    });
    analytics.event(AnalyticsEvent.ReportDownload, { report: 'yearSummary' });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="year-summary-content">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label={t(($) => $.reports.yearSummary.rewardIncome)}
          // A fiat total without the rewards that have no rate would look complete.
          value={
            summary.rewardsWithoutRate > 0
              ? '-'
              : formatHundredths(summary.rewardsTotalHundredths, currency)
          }
          detail={
            summary.rewardsWithoutRate > 0
              ? t(($) => $.reports.yearSummary.withoutRate, {
                  icp: formatIcp(summary.rewardsTotalE8s),
                  count: summary.rewardsWithoutRate,
                })
              : `${formatIcp(summary.rewardsTotalE8s)} ICP`
          }
          testId="year-summary-rewards"
        />
        <Tile
          label={holdingsLabel}
          value={
            summary.holdingsTotalHundredths === undefined
              ? '-'
              : formatHundredths(summary.holdingsTotalHundredths, currency)
          }
          detail={holdingsDetail}
          testId="year-summary-holdings"
        />
        <Tile
          label={t(($) => $.reports.yearSummary.receivedSent)}
          value={`${formatSigned(summary.receivedE8s, '+')} · ${formatSigned(summary.sentE8s, '−')}`}
          detail={t(($) => $.reports.yearSummary.fees, { fees: formatIcp(summary.feesE8s, 4) })}
          testId="year-summary-movements"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="font-sans text-sm font-medium">
          {t(($) => $.reports.yearSummary.rewards, { count: summary.rewards.length })}
        </h3>
        {summary.rewards.length === 0 ? (
          <p className="border-t py-3 text-sm text-muted-foreground">
            {t(($) => $.reports.yearSummary.noRewards)}
          </p>
        ) : (
          <table className="w-full text-sm" aria-labelledby={titleId}>
            <thead className="sr-only">
              <tr>
                <th scope="col">{t(($) => $.reports.yearSummary.columns.date)}</th>
                <th scope="col" className="hidden sm:table-cell">
                  {t(($) => $.reports.yearSummary.columns.account)}
                </th>
                <th scope="col">{t(($) => $.reports.yearSummary.columns.amount)}</th>
                <th scope="col">{t(($) => $.reports.yearSummary.columns.value, { currency })}</th>
              </tr>
            </thead>
            <tbody>
              {summary.rewards.map(({ entity, transaction, valueHundredths }) => (
                <tr
                  key={`${entity.accountId}-${transaction.id}`}
                  className="border-t"
                  data-testid="year-summary-reward-row"
                >
                  <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                    {utcDateFormat.format(transaction.timestampMs ?? 0)}
                  </td>
                  <td className="hidden max-w-0 truncate py-2.5 pr-3 text-muted-foreground sm:table-cell sm:w-full">
                    {entity.kind === 'account'
                      ? entity.name
                      : t(($) => $.reports.yearSummary.neuron, { id: entity.neuronId.toString() })}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap tabular-nums">
                    <SensitiveValue size="sm">
                      {formatIcp(transaction.amountE8s)} ICP
                    </SensitiveValue>
                  </td>
                  <td className="py-2.5 text-right font-mono whitespace-nowrap text-muted-foreground tabular-nums">
                    {valueHundredths === undefined ? (
                      t(($) => $.reports.yearSummary.noRate)
                    ) : (
                      <SensitiveValue size="sm">
                        {formatHundredths(valueHundredths, currency)}
                      </SensitiveValue>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!summary.complete && (
        <p role="status" className="text-sm text-muted-foreground">
          {t(($) => $.reports.yearSummary.incomplete)}
        </p>
      )}

      {summary.fiatRatesFinalAtMs !== undefined && (
        <NonFinalRatesNote
          finalAtMs={summary.fiatRatesFinalAtMs}
          currency={currency}
          testId="year-summary-non-final-note"
        />
      )}

      <div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-start md:justify-between">
        <details className="group text-sm text-muted-foreground">
          {/* As tall as the button, so that both line up while the list is open. */}
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
            <Info className="size-4" aria-hidden="true" />
            {t(($) => $.reports.yearSummary.notIncluded)}
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="mt-3 ml-5.5 list-disc space-y-1.5 pl-4">
            {limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </details>
        <ReportDownloadButton
          titleId={sectionTitleId}
          onClick={handleDownload}
          isPending={false}
          testId="year-summary-download-btn"
        />
      </div>
    </div>
  );
};

const Tile = ({
  label,
  value,
  detail,
  testId,
}: {
  label: string;
  value: string;
  detail: string;
  testId: string;
}) => (
  <div className="min-w-0 rounded-md bg-background px-4 py-3.5" data-testid={testId}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 truncate font-serif text-2xl">
      <SensitiveValue>{value}</SensitiveValue>
    </p>
    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
      <SensitiveValue size="sm">{detail}</SensitiveValue>
    </p>
  </div>
);
