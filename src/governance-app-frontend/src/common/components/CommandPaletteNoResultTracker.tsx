import { useCommandState } from 'cmdk';
import { useEffect, useState } from 'react';

import { createNoResultReporter } from '@features/analytics/commandPaletteSearch';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

/**
 * Reports a command palette search that has no result. Render it inside the `Command` root.
 * A close sends the pending search, before the palette clears the search.
 */
export const CommandPaletteNoResultTracker = ({ open }: { open: boolean }) => {
  const search = useCommandState((state) => state.search);
  const hasResults = useCommandState((state) => state.filtered.count > 0);
  const [reporter] = useState(() =>
    createNoResultReporter((query) =>
      analytics.event(AnalyticsEvent.CommandPaletteNoResult, { query }),
    ),
  );

  // Before the update, which cancels the pending search when the search becomes empty.
  useEffect(() => {
    if (!open) reporter.flush();
  }, [reporter, open]);
  useEffect(() => {
    if (open) reporter.update(search, hasResults);
  }, [reporter, open, search, hasResults]);
  useEffect(() => () => reporter.flush(), [reporter]);

  return null;
};
