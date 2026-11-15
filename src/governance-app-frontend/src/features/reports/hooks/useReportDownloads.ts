import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { errorNotification, infoNotification, warningNotification } from '@utils/notification';

import { downloadCsv } from '../utils/csv';
import {
  getReportEntities,
  loadNnsDappAccounts,
  loadReportNeurons,
  loadReportTransactions,
} from '../utils/loadReportData';
import { buildNeuronsCsv } from '../utils/neuronsCsv';
import { type ReportPeriod, type ReportRange, toIsoDate } from '../utils/period';
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
  const labels = useNeuronsCsvLabels();

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

export const useTransactionsReportDownload = () => {
  const { t } = useTranslation();
  const getIdentity = useIdentityOrThrow();
  const labels = useTransactionsCsvLabels();
  const mainAccountName = t(($) => $.accounts.mainAccount);

  return useMutation({
    mutationFn: async ({ range, period }: { range: ReportRange; period: ReportPeriod }) => {
      const identity = getIdentity();
      const [neurons, nnsDappAccounts] = await Promise.all([
        loadReportNeurons(),
        loadNnsDappAccounts(),
      ]);
      const entities = getReportEntities({ identity, mainAccountName, nnsDappAccounts, neurons });
      const { results, complete } = await loadReportTransactions({ entities, range });

      if (results.every(({ transactions }) => transactions.length === 0)) {
        infoNotification({ description: t(($) => $.reports.transactions.empty) });
        return;
      }

      downloadCsv({
        fileName: t(($) => $.reports.transactions.fileName, {
          from: toIsoDate(range.fromMs),
          to: toIsoDate(range.toMs - 1),
        }),
        content: buildTransactionsCsv({ results, labels }),
      });
      if (!complete) {
        warningNotification({ description: t(($) => $.reports.transactions.incomplete) });
      }
      analytics.event(AnalyticsEvent.ReportDownload, { report: 'transactions', period });
    },
    onError: (_, { period }) => {
      errorNotification({ description: t(($) => $.reports.transactions.error) });
      analytics.event(AnalyticsEvent.ReportDownloadError, { report: 'transactions', period });
    },
  });
};
