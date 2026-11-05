import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { NativeSelect, NativeSelectOption } from '@components/NativeSelect';
import { ForecastPeriod } from '@constants/forecast';
import { useForecastPeriod } from '@hooks/useForecastPeriod';

export const ForecastPeriodCard = () => {
  const { t } = useTranslation();
  const { forecastPeriod, setForecastPeriod } = useForecastPeriod();

  const optionLabels: Record<ForecastPeriod, string> = {
    [ForecastPeriod.Week]: t(($) => $.userAccount.forecastPeriod.options.week),
    [ForecastPeriod.Month]: t(($) => $.userAccount.forecastPeriod.options.month),
    [ForecastPeriod.Year]: t(($) => $.userAccount.forecastPeriod.options.year),
  };

  const handleChange = (period: ForecastPeriod) => {
    setForecastPeriod(period);
    analytics.event(AnalyticsEvent.ForecastPeriodChange, { period, source: 'settings' });
  };

  return (
    <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-x-4 md:gap-y-0">
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.userAccount.forecastPeriod.title)}</p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.userAccount.forecastPeriod.description)}
        </p>
      </div>
      <NativeSelect
        value={forecastPeriod}
        onChange={(e) => handleChange(e.target.value as ForecastPeriod)}
        aria-label={t(($) => $.userAccount.forecastPeriod.title)}
        className="md:w-60"
        data-testid="forecast-period-select"
      >
        {Object.values(ForecastPeriod).map((period) => (
          <NativeSelectOption key={period} value={period}>
            {optionLabels[period]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
};
