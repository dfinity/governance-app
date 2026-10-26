import { useSyncExternalStore } from 'react';

import { FORECAST_PERIOD_STORAGE_KEY } from '@constants/extra';
import { ForecastPeriod } from '@constants/forecast';
import { MaturityEstimatePeriod } from '@utils/staking-rewards';

export const FORECAST_ESTIMATE_PERIOD: Record<ForecastPeriod, MaturityEstimatePeriod> = {
  [ForecastPeriod.Week]: MaturityEstimatePeriod.WEEK,
  [ForecastPeriod.Month]: MaturityEstimatePeriod.MONTH,
  [ForecastPeriod.Year]: MaturityEstimatePeriod.YEAR,
};

/** Returns the period after the given one, and the shortest period after the longest. */
export const getNextForecastPeriod = (period: ForecastPeriod): ForecastPeriod => {
  const periods = Object.values(ForecastPeriod);
  return periods[(periods.indexOf(period) + 1) % periods.length];
};

const getStoredValue = (): ForecastPeriod => {
  try {
    const value = localStorage.getItem(FORECAST_PERIOD_STORAGE_KEY);
    if (Object.values(ForecastPeriod).includes(value as ForecastPeriod)) {
      return value as ForecastPeriod;
    }
  } catch {
    // ignore
  }
  return ForecastPeriod.Year;
};

const storeValue = (period: ForecastPeriod): void => {
  localStorage.setItem(FORECAST_PERIOD_STORAGE_KEY, period);
  notifyListeners();
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key === FORECAST_PERIOD_STORAGE_KEY) notifyListeners();
};

const subscribe = (listener: () => void) => {
  const isFirst = listeners.length === 0;
  listeners = [...listeners, listener];
  if (isFirst) window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0) window.removeEventListener('storage', onStorage);
  };
};

const getSnapshot = (): ForecastPeriod => getStoredValue();

/**
 * Hook to manage the period of the maturity forecast, with localStorage persistence.
 * Uses useSyncExternalStore for cross-component and cross-tab reactivity.
 */
export const useForecastPeriod = () => {
  const forecastPeriod = useSyncExternalStore(subscribe, getSnapshot);

  return { forecastPeriod, setForecastPeriod: storeValue };
};
