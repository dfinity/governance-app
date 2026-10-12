import { nonNullish } from '@dfinity/utils';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { FiatCurrency } from '@constants/fiat';
import { useFiatCurrency } from '@hooks/useFiatCurrency';
import { formatFiat, type FormatFiatOptions } from '@utils/numbers';

import { useFiatExchangeRates } from './useFiatExchangeRates';
import { useTickerPrices } from './useTickerPrices';

/**
 * Gives the ICP price in the fiat currency that the user picked in the settings.
 * Uses USD if the backend has no exchange rate for that currency.
 */
export const useIcpPrice = () => {
  const { tickerPrices } = useTickerPrices();
  const { fiatCurrency } = useFiatCurrency();
  const needsExchangeRate = fiatCurrency !== FiatCurrency.USD;
  const fiatExchangeRates = useFiatExchangeRates({ enabled: needsExchangeRate });

  const isRateLoading = needsExchangeRate && fiatExchangeRates.isLoading;
  const usdToFiat = needsExchangeRate ? fiatExchangeRates.data?.get(fiatCurrency) : undefined;
  const currency = nonNullish(usdToFiat) ? fiatCurrency : FiatCurrency.USD;
  const toFiat = (usdValue: number) => usdValue * (usdToFiat ?? 1);

  const icpPriceUsd = tickerPrices.data?.get(CANISTER_ID_ICP_LEDGER!)?.usd;

  return {
    // No price while the rate loads, so that the values do not change from USD to the picked currency.
    icpPrice: nonNullish(icpPriceUsd) && !isRateLoading ? toFiat(icpPriceUsd) : undefined,
    currency,
    toFiat,
    formatFiat: (value: number, options?: FormatFiatOptions) =>
      formatFiat(value, currency, options),
    isLoading: tickerPrices.isLoading || isRateLoading,
    isError: tickerPrices.isError,
  };
};
