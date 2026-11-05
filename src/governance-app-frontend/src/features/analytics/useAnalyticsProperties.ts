import { useEffect } from 'react';

import { analytics } from '@features/analytics/service';

import { useGovernanceNeurons } from '@hooks/governance';
import { useForecastPeriod } from '@hooks/useForecastPeriod';
import { useHideBalances } from '@hooks/useHideBalances';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';

const yesNo = (value: boolean) => (value ? 'yes' : 'no');

/**
 * Keeps the Plausible properties that describe the user's setup in sync, so every
 * event and pageview can be split by them.
 */
export const useAnalyticsProperties = () => {
  const { theme } = useTheme();
  const { hidden } = useHideBalances();
  const { forecastPeriod } = useForecastPeriod();
  const { enabled: shortcutsEnabled } = useShortcutSettings();
  const neurons = useGovernanceNeurons().data?.response;

  useEffect(() => {
    analytics.setProperties({
      theme,
      hide_balances: yesNo(hidden),
      forecast_period: forecastPeriod,
      shortcuts_enabled: yesNo(shortcutsEnabled),
      // Overwrite a previous user's value while the neurons load.
      has_neurons: neurons ? yesNo(neurons.length > 0) : 'unknown',
    });
  }, [theme, hidden, forecastPeriod, shortcutsEnabled, neurons]);
};
