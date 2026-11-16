import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFiatCurrency } from '@hooks/useFiatCurrency';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { QUERY_KEYS } from '@utils/query';

import {
  getOwnNeurons,
  getReportEntities,
  loadEntityHistories,
  loadNnsDappAccounts,
  loadReportNeurons,
  loadReportRates,
} from '../utils/loadReportData';
import { buildYearSummary, getYearPeriod } from '../utils/yearSummary';

/** The summary loads all transactions of the year, so it stays fresh for a few minutes. */
const YEAR_SUMMARY_STALE_MS = 5 * 60 * 1_000;

export const useYearSummary = (year: number) => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const { fiatCurrency } = useFiatCurrency();
  const mainAccountName = t(($) => $.accounts.mainAccount);

  return useQuery({
    queryKey: [
      QUERY_KEYS.REPORTS.YEAR_SUMMARY,
      identity?.getPrincipal().toText(),
      year,
      fiatCurrency,
    ],
    queryFn: async () => {
      if (!identity) throw new Error('The year summary needs a signed-in identity.');

      const period = getYearPeriod(year, Date.now());
      // The rates load before the transaction scan, so that a failed rate load leaves no scan running.
      const [allNeurons, nnsDappAccounts, rateLookup] = await Promise.all([
        loadReportNeurons(),
        loadNnsDappAccounts(),
        loadReportRates({ range: period, currency: fiatCurrency }),
      ]);
      const neurons = getOwnNeurons({ identity, nnsDappAccounts, neurons: allNeurons });
      const entities = getReportEntities({ identity, mainAccountName, nnsDappAccounts, neurons });
      const { histories, complete } = await loadEntityHistories({
        entities,
        fromMs: period.fromMs,
      });

      return buildYearSummary({ period, histories, complete, neurons, rateLookup });
    },
    enabled: identity !== undefined && identity !== null,
    staleTime: YEAR_SUMMARY_STALE_MS,
    retry: false,
  });
};
