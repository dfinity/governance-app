import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { InViewSentinel } from '@components/extra/InViewSentinel';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposals } from '@hooks/canisters/governance';
import useTitle from '@hooks/useTitle';

import { ProposalCard } from '@/features/voting/components/ProposalCard';

import { useVotableLoadedProposals } from './-hooks/useVotableLoadedProposals';

export const Route = createFileRoute('/nns/proposals/')({
  component: ProposalsPage,
});

function ProposalsPage() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  const votableProposals = useVotableLoadedProposals();
  const proposals = useGovernanceProposals();

  return (
    <div className="flex flex-col gap-2 text-xl">
      <h2 className="mb-2 text-3xl font-bold tracking-tight">{t(($) => $.common.proposalsList)}</h2>

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
                    to="/nns/proposals/$id"
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
