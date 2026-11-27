import {
  asSafeSpreadsheetText,
  asSpreadsheetText,
  buildCsvLines,
  type CsvColumn,
  formatE8sForCsv,
  formatHundredthsForCsv,
  formatUtcDate,
  formatUtcDateTime,
  joinCsvLines,
  toCsvLine,
} from './csv';
import type { ReportRate } from './rates';
import type { ReportEntity } from './transactionsCsv';
import type { HoldingRow, RewardRow, YearSummary } from './yearSummary';

export type YearSummaryCsvLabels = {
  title: string;
  period: string;
  currency: string;
  total: string;
  rewards: string;
  /** For example, "Holdings on 31 December 2025" or "Holdings today". */
  holdings: string;
  movements: string;
  notIncluded: string;
  /** The warning for a summary that misses the oldest transactions of an account. */
  incomplete: string;
  headers: {
    date: string;
    account: string;
    accountId: string;
    neuronId: string;
    amount: string;
    balance: string;
    price: string;
    value: string;
    rateDate: string;
    /** The date of the USD/fiat rate, for a currency other than USD. */
    fiatRateDate?: string;
    maturity: string;
    received: string;
    sent: string;
    fees: string;
  };
  limits: string[];
};

const entityColumns = (
  headers: YearSummaryCsvLabels['headers'],
): CsvColumn<{ entity: ReportEntity }>[] => [
  {
    header: headers.account,
    value: ({ entity }) => (entity.kind === 'account' ? asSafeSpreadsheetText(entity.name) : ''),
  },
  { header: headers.accountId, value: ({ entity }) => entity.accountId },
  {
    header: headers.neuronId,
    value: ({ entity }) =>
      entity.kind === 'neuron' ? asSpreadsheetText(entity.neuronId.toString()) : '',
  },
];

const optionalHundredths = (hundredths: bigint | undefined): string =>
  hundredths === undefined ? '' : formatHundredthsForCsv(hundredths);

/**
 * One file with four parts, each after an empty line: the reward income, the holdings at the
 * end of the period, the movements, and what the summary does not include.
 */
export const buildYearSummaryCsv = ({
  summary,
  currency,
  labels,
}: {
  summary: YearSummary;
  currency: string;
  labels: YearSummaryCsvLabels;
}): string => {
  const { headers } = labels;
  const { period, holdingsRate } = summary;

  const rewardColumns: CsvColumn<RewardRow>[] = [
    {
      header: headers.date,
      value: ({ transaction }) => formatUtcDateTime(transaction.timestampMs ?? 0),
    },
    ...entityColumns(headers),
    { header: headers.amount, value: ({ transaction }) => formatE8sForCsv(transaction.amountE8s) },
    {
      header: headers.price,
      value: ({ rate }) => (rate === undefined ? '' : formatE8sForCsv(rate.icpToFiatE8s)),
    },
    { header: headers.value, value: ({ valueHundredths }) => optionalHundredths(valueHundredths) },
    {
      header: headers.rateDate,
      value: ({ rate }) => (rate === undefined ? '' : formatUtcDate(rate.dayMs)),
    },
    ...(headers.fiatRateDate === undefined
      ? []
      : [
          {
            header: headers.fiatRateDate,
            value: ({ rate }: { rate: ReportRate | undefined }) =>
              rate === undefined ? '' : formatUtcDate(rate.fiatDayMs),
          },
        ]),
  ];

  const holdingColumns: CsvColumn<HoldingRow>[] = [
    ...entityColumns(headers),
    { header: headers.balance, value: ({ balanceE8s }) => formatE8sForCsv(balanceE8s) },
  ];

  return joinCsvLines([
    toCsvLine([labels.title, String(period.year)]),
    toCsvLine([
      labels.period,
      `${formatUtcDate(period.fromMs)} - ${formatUtcDate(period.toMs - 1)}`,
    ]),
    toCsvLine([labels.currency, currency]),
    '',
    toCsvLine([labels.rewards]),
    ...buildCsvLines(rewardColumns, summary.rewards),
    toCsvLine([
      labels.total,
      '',
      '',
      '',
      formatE8sForCsv(summary.rewardsTotalE8s),
      '',
      // A total without the rewards that have no rate would look complete.
      summary.rewardsWithoutRate > 0 ? '' : formatHundredthsForCsv(summary.rewardsTotalHundredths),
      '',
    ]),
    '',
    toCsvLine([labels.holdings]),
    ...buildCsvLines(holdingColumns, summary.holdings),
    toCsvLine([labels.total, '', '', formatE8sForCsv(summary.holdingsTotalE8s)]),
    toCsvLine([
      headers.price,
      holdingsRate === undefined ? '' : formatE8sForCsv(holdingsRate.icpToFiatE8s),
    ]),
    toCsvLine([headers.value, optionalHundredths(summary.holdingsTotalHundredths)]),
    toCsvLine([
      headers.rateDate,
      holdingsRate === undefined ? '' : formatUtcDate(holdingsRate.dayMs),
    ]),
    ...(headers.fiatRateDate === undefined
      ? []
      : [
          toCsvLine([
            headers.fiatRateDate,
            holdingsRate === undefined ? '' : formatUtcDate(holdingsRate.fiatDayMs),
          ]),
        ]),
    ...(summary.maturityE8s === undefined
      ? []
      : [toCsvLine([headers.maturity, formatE8sForCsv(summary.maturityE8s)])]),
    '',
    toCsvLine([labels.movements]),
    toCsvLine([headers.received, formatE8sForCsv(summary.receivedE8s)]),
    toCsvLine([headers.sent, formatE8sForCsv(summary.sentE8s)]),
    toCsvLine([headers.fees, formatE8sForCsv(summary.feesE8s)]),
    '',
    toCsvLine([labels.notIncluded]),
    ...(summary.complete ? [] : [toCsvLine([labels.incomplete])]),
    ...labels.limits.map((limit) => toCsvLine([limit])),
  ]);
};
