import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ProposalCard } from '@features/proposals/components/ProposalCard';
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
    <div>
      <QueryStates
        infiniteQuery={proposals}
        isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.pages?.map((page) =>
              page?.response.proposals.map((proposal) => {
                const canUserVote = votableProposals.has(proposal.id);

                return (
                  <Link
                    params={{ id: proposal.id }}
                    to="/voting/proposals/$id"
                    key={proposal.id?.toString()}
                    className="group flex h-full flex-col"
                  >
                    <ProposalCard
                      proposal={proposal}
                      canUserVote={canUserVote}
                      certified={page?.certified}
                    />
                  </Link>
                );
              }),
            )}

            {proposals.hasNextPage && (
              <InViewSentinel retrigger={data} callback={proposals.fetchNextPage}>
                <SkeletonLoader count={3} />
              </InViewSentinel>
            )}
          </div>
        )}
      </QueryStates>
    </div>
  );
}
