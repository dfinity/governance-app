import { ProposalInfo } from '@icp-sdk/canisters/nns';

import { MILLISECONDS_IN_SECOND } from '@constants/extra';

import { hasTallyHistory, TallyChart, toTallyChart } from '../tallyHistory';
import { useProposalTallyHistory } from './useProposalTallyHistory';

/**
 * The chart of the Voting history card: `undefined` while the history loads, and `null` when the
 * card does not show.
 */
export const useVotingHistoryChart = (proposal: ProposalInfo): TallyChart | null | undefined => {
  const historyQuery = useProposalTallyHistory(proposal);

  if (!hasTallyHistory(proposal) || historyQuery.isError) return null;
  if (!historyQuery.data) return historyQuery.isPending ? undefined : null;

  return (
    toTallyChart({
      history: historyQuery.data,
      proposal,
      // A poll with unchanged data still updates this, so the held line keeps up.
      readAtSeconds: Math.floor(historyQuery.dataUpdatedAt / MILLISECONDS_IN_SECOND),
    }) ?? null
  );
};
