import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import { useVotableLoadedProposals } from '@features/proposals/hooks/useVotableLoadedProposals';

import { InViewSentinel } from '@components/InViewSentinel';
import { QueryStates } from '@components/QueryStates';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useGovernanceProposals } from '@hooks/governance';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/voting/')({
  component: Voting,
});

function Voting() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  const votableProposals = useVotableLoadedProposals();
  const proposals = useGovernanceProposals();

  return (
    <div className="flex flex-col gap-4">
      <QueryStates
        infiniteQuery={proposals}
        isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
      >
        {(data) => (
          <div className="flex flex-col gap-4">
            {data?.pages?.map((page) =>
              page?.response.proposals.map((proposal) => {
                const canUserVote = votableProposals.has(proposal.id);

                return (
                  <div key={proposal.id?.toString()} className="w-full">
                    <ProposalListItem
                      proposal={proposal}
                      canUserVote={canUserVote}
                      certified={page?.certified}
                    />
                  </div>
                );
              }),
            )}

            {proposals.hasNextPage && (
              <InViewSentinel retrigger={data} callback={proposals.fetchNextPage}>
                {/* @TODO: Update skeleton loader to match list item */}
                <SkeletonLoader count={3} />
              </InViewSentinel>
            )}
          </div>
        )}
      </QueryStates>
    </div>
  );
}
