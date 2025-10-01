import { createFileRoute } from '@tanstack/react-router';
import { Vote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BadgeWithIcon, Link } from '@untitledui/components';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { QueryStates } from '@components/extra/QueryStates';
import { SimpleCard } from '@components/extra/SimpleCard';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposals } from '@hooks/canisters/governance';
import useTitle from '@hooks/useTitle';

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
      <h2 className="mb-2 text-primary">{t(($) => $.common.proposalsList)}</h2>

      <QueryStates
        infiniteQuery={proposals}
        isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
            {data?.pages?.map((page) =>
              page?.response.proposals.map((proposal) => {
                const canUserVote = votableProposals.has(proposal.id);

                return (
                  <Link
                    params={{ id: proposal.id?.toString() ?? '' }}
                    key={proposal.id?.toString()}
                    to="/nns/proposals/$id"
                  >
                    <SimpleCard>
                      <p className="overflow-hidden overflow-ellipsis">
                        #{proposal.id?.toString()} {proposal.proposal?.title}
                      </p>
                      <div className="mt-4 flex h-4 items-end justify-between text-sm font-bold">
                        <BadgeWithIcon
                          iconLeading={canUserVote ? Vote : undefined}
                          color={canUserVote ? 'blue-light' : 'blue'}
                        >
                          {t(($) => $.enums.ProposalStatus[proposal.status])}
                        </BadgeWithIcon>
                        <CertifiedBadge certified={page?.certified} />
                      </div>
                    </SimpleCard>
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
