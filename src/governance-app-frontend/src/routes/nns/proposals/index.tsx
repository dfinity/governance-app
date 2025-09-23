import { createFileRoute } from '@tanstack/react-router';
import { Vote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BadgeWithIcon, Link } from '@untitledui/components';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceGetProposals } from '@hooks/canisters/governance';
import useTitle from '@hooks/useTitle';

import { useVotableLoadedProposals } from './hooks/useVotableLoadedProposals';

export const Route = createFileRoute('/nns/proposals/')({
  component: ProposalsPage,
});

function ProposalsPage() {
  const { isLoading, error, data, hasNextPage, fetchNextPage } = useGovernanceGetProposals();
  const { t } = useTranslation();
  const votableProposals = useVotableLoadedProposals();

  useTitle(t(($) => $.common.proposalsList));

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2 text-primary">{t(($) => $.common.proposalsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.pages?.length && (
        <p className="text-sm font-bold text-orange-600">⚠️ {t(($) => $.common.noProposals)}</p>
      )}
      {error && t(($) => $.common.errorLoadingProposals, { error: error.message })}

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
                <div className="flex h-full flex-col justify-between rounded-lg bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset focus-visible:outline-2 focus-visible:outline-offset-2">
                  <p className="overflow-hidden overflow-ellipsis text-secondary">
                    #{proposal.id?.toString()} {proposal.proposal?.title}
                  </p>
                  <div className="mt-4 flex h-4 items-end justify-between text-sm font-bold text-secondary">
                    <BadgeWithIcon
                      iconLeading={canUserVote ? Vote : undefined}
                      color={canUserVote ? 'blue-light' : 'blue'}
                    >
                      {t(($) => $.enums.ProposalStatus[proposal.status])}
                    </BadgeWithIcon>
                    <CertifiedBadge certified={page?.certified} />
                  </div>
                </div>
              </Link>
            );
          }),
        )}

        {hasNextPage && (
          <InViewSentinel retrigger={data} callback={fetchNextPage}>
            <SkeletonLoader count={3} />
          </InViewSentinel>
        )}
      </div>
    </div>
  );
}
