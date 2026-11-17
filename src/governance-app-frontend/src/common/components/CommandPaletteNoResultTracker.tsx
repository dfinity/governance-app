import { useCommandState } from 'cmdk';
import { useEffect, useState } from 'react';

import { createNoResultReporter } from '@features/analytics/commandPaletteSearch';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

/**
 * Reports a command palette search that has no result. Render it inside the `Command` root.
 * The dialog unmounts its content when it closes, which sends the pending search.
 */
export const CommandPaletteNoResultTracker = () => {
  const search = useCommandState((state) => state.search);
  const hasResults = useCommandState((state) => state.filtered.count > 0);
  const [reporter] = useState(() =>
    createNoResultReporter((query) =>
      analytics.event(AnalyticsEvent.CommandPaletteNoResult, { query }),
    ),
  );

  useEffect(() => reporter.update(search, hasResults), [reporter, search, hasResults]);
  useEffect(() => () => reporter.flush(), [reporter]);

  return null;
};
