import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { E8S } from '@constants/extra';
import { formatPercentage } from '@utils/numbers';

import { useVotingHistoryChart } from '../hooks/useVotingHistoryChart';
import { VOTING_HISTORY_CARD_ID } from '../tallyHistory';

type Props = {
  proposal: ProposalInfo;
};

const scrollToVotingHistory = () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById(VOTING_HISTORY_CARD_ID)
    ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
};

/**
 * The Yes and No shares of the total voting power, for the header of the proposal page.
 * When the Voting history card shows, a click scrolls to it.
 */
export const ProposalResultSummary = ({ proposal }: Props) => {
  const { t } = useTranslation();
  const hasVotingHistory = useVotingHistoryChart(proposal) !== null;

  const { latestTally } = proposal;
  if (isNullish(latestTally)) return null;

  const total = Number(latestTally.total) / E8S;
  const yesShare = total > 0 ? Number(latestTally.yes) / E8S / total : 0;
  const noShare = total > 0 ? Number(latestTally.no) / E8S / total : 0;

  const result = (
    <>
      <span className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>
          <span className="text-emerald-800 dark:text-emerald-400">
            {t(($) => $.proposal.yes)} {formatPercentage(yesShare)}
          </span>
          <span aria-hidden className="font-normal text-muted-foreground">
            {' · '}
          </span>
          <span className="text-red-700 dark:text-red-400">
            {t(($) => $.proposal.no)} {formatPercentage(noShare)}
          </span>
        </span>
        {hasVotingHistory && (
          <span className="flex shrink-0 items-center gap-1 font-normal text-muted-foreground transition-colors group-hover:text-foreground">
            {t(($) => $.proposal.votingHistory.title)}
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-hover:translate-y-0.5"
            />
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="relative mt-1.5 block h-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <span className="absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-foreground/20" />
        <span
          className="absolute inset-y-0 left-0 bg-emerald-800 dark:bg-emerald-400"
          style={{ width: `${yesShare * 100}%` }}
        />
        <span
          className="absolute inset-y-0 right-0 bg-red-800 dark:bg-red-400"
          style={{ width: `${noShare * 100}%` }}
        />
      </span>
    </>
  );

  return hasVotingHistory ? (
    <button
      type="button"
      onClick={scrollToVotingHistory}
      data-testid="proposal-result-summary"
      className="group block w-full cursor-pointer rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {result}
    </button>
  ) : (
    <div data-testid="proposal-result-summary">{result}</div>
  );
};
