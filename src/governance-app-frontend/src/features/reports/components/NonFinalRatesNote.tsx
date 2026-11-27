import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { FiatCurrency } from '@constants/fiat';
import { secondsToDate } from '@utils/date';

type Props = {
  /** 00:00 UTC of the day when the fiat values are final. */
  finalAtMs: number;
  currency: FiatCurrency;
  testId: string;
};

export const NonFinalRatesNote = ({ finalAtMs, currency, testId }: Props) => {
  const { t } = useTranslation();

  return (
    <p role="status" className="flex gap-1.5 text-sm text-muted-foreground" data-testid={testId}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {t(($) => $.reports.nonFinalRates, {
        currency,
        date: secondsToDate(finalAtMs / 1_000, { timeZone: 'UTC' }),
      })}
    </p>
  );
};
