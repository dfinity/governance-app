import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { useQuery } from '@tanstack/react-query';

import { useDashboardCollectorCanister } from '@hooks/dashboardCollector';
import { QUERY_KEYS } from '@utils/query';

import {
  hasTallyHistory,
  isTallyHistoryOpen,
  TALLY_POLL_INTERVAL_MS,
  TallyHistory,
} from '../tallyHistory';

// A query call only: the collector refuses update calls, so this data is not certified.
export const useProposalTallyHistory = (proposal: ProposalInfo) => {
  const { ready, canister } = useDashboardCollectorCanister();

  return useQuery<TallyHistory>({
    queryKey: [QUERY_KEYS.DASHBOARD_COLLECTOR.TALLY_HISTORY, proposal.id?.toString()],
    // One page holds a whole track: the collector caps a track at the page size.
    queryFn: () => canister!.service.getTallyHistory(proposal.id!, 0n),
    enabled: ready && hasTallyHistory(proposal),
    // A closed track never changes.
    staleTime: ({ state }) =>
      state.data === undefined || isTallyHistoryOpen(state.data)
        ? TALLY_POLL_INTERVAL_MS
        : Infinity,
    refetchInterval: ({ state }) =>
      isTallyHistoryOpen(state.data) ? TALLY_POLL_INTERVAL_MS : false,
  });
};
