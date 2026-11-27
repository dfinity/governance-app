import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import type { FiatCurrency } from '@constants/fiat';
import { useIcpPrice } from '@hooks/tickers/useIcpPrice';
import { useFiatCurrency } from '@hooks/useFiatCurrency';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { errorNotification, infoNotification, warningNotification } from '@utils/notification';

import { downloadCsv } from '../utils/csv';
import {
  getReportEntities,
  loadNnsDappAccounts,
  loadReportNeurons,
  loadReportRates,
  loadReportTransactions,
} from '../utils/loadReportData';
import { buildNeuronsCsv } from '../utils/neuronsCsv';
import { type ReportPeriod, type ReportRange, toIsoDate } from '../utils/period';
import { getFiatRatesFinalAtMs } from '../utils/rates';
import { buildTransactionsCsv } from '../utils/transactionsCsv';
import { useNeuronsCsvLabels, useTransactionsCsvLabels } from './useReportCsvLabels';

const useIdentityOrThrow = () => {
  const { identity } = useInternetIdentity();

  return () => {
    if (!identity) throw new Error('The reports need a signed-in identity.');
    return identity;
  };
};

export const useNeuronsReportDownload = () => {
  const { t } = useTranslation();
  const getIdentity = useIdentityOrThrow();
  const { icpPrice, currency } = useIcpPrice();
  const labels = useNeuronsCsvLabels(currency);

  return useMutation({
    mutationFn: async () => {
      const identity = getIdentity();
      const [neurons, nnsDappAccounts] = await Promise.all([
        loadReportNeurons(),
        loadNnsDappAccounts(),
      ]);

      if (neurons.length === 0) {
        infoNotification({ description: t(($) => $.reports.neurons.empty) });
        return;
      }

      const now = new Date();
      downloadCsv({
        fileName: t(($) => $.reports.neurons.fileName, { date: toIsoDate(now.getTime()) }),
        content: buildNeuronsCsv({
          neurons,
          principalId: identity.getPrincipal().toText(),
          ledgerPrincipals: nnsDappAccounts.hardwareWallets.map(({ principal }) =>
            principal.toText(),
          ),
          labels,
          now,
          icpPrice,
        }),
      });
      analytics.event(AnalyticsEvent.ReportDownload, { report: 'neurons' });
    },
    onError: () => {
      errorNotification({ description: t(($) => $.reports.neurons.error) });
      analytics.event(AnalyticsEvent.ReportDownloadError, { report: 'neurons' });
    },
  });
};

/** The currency of a downloaded transactions file, and when its fiat values are final. */
export type TransactionsReportFile = {
  currency: FiatCurrency;
  fiatRatesFinalAtMs: number | undefined;
};

export const useTransactionsReportDownload = () => {
  const { t } = useTranslation();
  const getIdentity = useIdentityOrThrow();
  const { fiatCurrency } = useFiatCurrency();
  const labels = useTransactionsCsvLabels(fiatCurrency);
  const mainAccountName = t(($) => $.accounts.mainAccount);

  return useMutation({
    mutationFn: async ({
      range,
      period,
    }: {
      range: ReportRange;
      period: ReportPeriod;
    }): Promise<TransactionsReportFile | undefined> => {
      const identity = getIdentity();
      // The rates load before the transaction scan, so that a failed rate load leaves no scan running.
      const [neurons, nnsDappAccounts, rateLookup] = await Promise.all([
        loadReportNeurons(),
        loadNnsDappAccounts(),
        loadReportRates({ range, currency: fiatCurrency }),
      ]);
      const entities = getReportEntities({ identity, mainAccountName, nnsDappAccounts, neurons });
      const { results, complete } = await loadReportTransactions({ entities, range });

      if (results.every(({ transactions }) => transactions.length === 0)) {
        // An incomplete fetch can miss the whole period, so it does not prove an empty period.
        if (complete) {
          infoNotification({ description: t(($) => $.reports.transactions.empty) });
        } else {
          warningNotification({ description: t(($) => $.reports.transactions.incomplete) });
        }
        return;
      }

      const fileNameDates = { from: toIsoDate(range.fromMs), to: toIsoDate(range.toMs - 1) };
      downloadCsv({
        // The file name marks a truncated file, so that the file shows it after the warning closes.
        fileName: complete
          ? t(($) => $.reports.transactions.fileName, fileNameDates)
          : t(($) => $.reports.transactions.incompleteFileName, fileNameDates),
        content: buildTransactionsCsv({ results, labels, rateLookup }),
      });
      if (!complete) {
        warningNotification({
          description: t(($) => $.reports.transactions.incomplete),
          persistent: true,
        });
      }
      analytics.event(AnalyticsEvent.ReportDownload, { report: 'transactions', period });

      return {
        currency: fiatCurrency,
        fiatRatesFinalAtMs: getFiatRatesFinalAtMs(
          results.flatMap(({ transactions }) =>
            transactions.map(({ timestampMs }) =>
              timestampMs === undefined ? undefined : rateLookup(timestampMs),
            ),
          ),
        ),
      };
    },
    onError: (_, { period }) => {
      errorNotification({ description: t(($) => $.reports.transactions.error) });
      analytics.event(AnalyticsEvent.ReportDownloadError, { report: 'transactions', period });
    },
  });
};
