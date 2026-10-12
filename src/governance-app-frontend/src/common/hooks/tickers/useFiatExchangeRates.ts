import { nonNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import type { FiatExchangeRate } from '@declarations/governance-app-backend/governance-app-backend.did';

import {
  E8S,
  FIAT_EXCHANGE_RATES_REFRESH_MS,
  FIAT_EXCHANGE_RATES_RETRY_MS,
} from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';
import { useGovernanceAppCanister } from '@hooks/addressBook/useGovernanceAppCanister';
import { QUERY_KEYS } from '@utils/query';

// Units of each fiat currency for one USD, by currency symbol. For example, "EUR" -> 0.92.
export type FiatExchangeRates = Map<string, number>;

type Props = {
  enabled?: boolean;
};

export const useFiatExchangeRates = ({ enabled = true }: Props) => {
  const canisterStatus = useGovernanceAppCanister();

  return useQuery<FiatExchangeRates>({
    queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.FIAT_EXCHANGE_RATES],
    queryFn: async () => {
      if (!canisterStatus.ready) {
        throw new Error('Canister not ready');
      }

      const response = await canisterStatus.canister.service.list_usd_to_fiat_exchange_rates();
      return parseFiatExchangeRatesResponse(response);
    },
    enabled: enabled && canisterStatus.ready,
    refetchInterval: (query) => getFiatExchangeRatesRefreshMs(query.state.data),
    retry: 1,
  });
};

const SUPPORTED_FIAT_SYMBOLS = Object.values(FiatCurrency).filter(
  (currency) => currency !== FiatCurrency.USD,
);

export const getFiatExchangeRatesRefreshMs = (rates: FiatExchangeRates | undefined): number =>
  nonNullish(rates) && SUPPORTED_FIAT_SYMBOLS.every((symbol) => rates.has(symbol))
    ? FIAT_EXCHANGE_RATES_REFRESH_MS
    : FIAT_EXCHANGE_RATES_RETRY_MS;

// Skips the currencies without a rate, so that the UI falls back to USD for them.
export const parseFiatExchangeRatesResponse = (rates: FiatExchangeRate[]): FiatExchangeRates =>
  new Map(
    rates
      .map(
        ({ symbol, rate: [rate] }) =>
          [symbol, nonNullish(rate) ? Number(rate.rate_e8s) / E8S : 0] as const,
      )
      .filter(([, value]) => value > 0 && Number.isFinite(value)),
  );
