import { useTranslation } from 'react-i18next';

import { NativeSelect, NativeSelectOption } from '@components/NativeSelect';
import { FiatCurrency } from '@constants/fiat';
import { useIcpPrice } from '@hooks/tickers';
import { useFiatCurrency } from '@hooks/useFiatCurrency';

// We only support English for now.
const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });

export const FiatCurrencyCard = () => {
  const { t } = useTranslation();
  const { fiatCurrency, setFiatCurrency } = useFiatCurrency();
  const { currency, isLoading } = useIcpPrice();

  const showFallback = !isLoading && currency !== fiatCurrency;

  return (
    <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-x-4 md:gap-y-0">
      <div>
        <div className="space-y-1">
          <p className="leading-none font-medium">{t(($) => $.userAccount.fiatCurrency.title)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.fiatCurrency.description)}
          </p>
        </div>
        {/* The status region stays in the DOM, so screen readers announce the note when it appears. */}
        <div role="status">
          {showFallback && (
            <p className="mt-1 text-sm text-muted-foreground" data-testid="fiat-currency-fallback">
              {t(($) => $.userAccount.fiatCurrency.fallback, { currency: fiatCurrency })}
            </p>
          )}
        </div>
      </div>
      <NativeSelect
        value={fiatCurrency}
        onChange={(e) => setFiatCurrency(e.target.value as FiatCurrency)}
        aria-label={t(($) => $.userAccount.fiatCurrency.title)}
        className="md:w-60"
        data-testid="fiat-currency-select"
      >
        {Object.values(FiatCurrency).map((value) => (
          <NativeSelectOption key={value} value={value}>
            {`${currencyNames.of(value)} (${value})`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
};
