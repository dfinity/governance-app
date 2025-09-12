import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceListProposals } from '@hooks/canisters/governance/useGovernanceListProposals';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/proposals/')({
  component: ProposalsPage,
});

function ProposalsPage() {
  const { isLoading, error, data, hasNextPage, fetchNextPage } = useGovernanceListProposals();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  return (
    <div className="text-xl flex gap-2 flex-col">
      <div className="flex gap-2 mb-2">{t(($) => $.common.proposalsList)}</div>
      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.pages?.length && t(($) => $.common.noProposals)}
      {error && t(($) => $.common.errorLoadingProposals, { error: error.message })}

      <div className="text-lg grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data?.pages?.map((page) =>
          page?.response.proposals.map((proposal) => (
            <Link to="/nns/proposals/$id" params={{ id: proposal.id?.toString() ?? '' }}>
              <div
                style={{ backgroundColor: 'var(--background-color-secondary)' }}
                className="border p-4 rounded-lg"
                key={proposal.id?.toString()}
              >
                #{proposal.id?.toString()} {proposal.proposal?.title}
                <div className="mt-4 flex items-end justify-between text-sm font-bold h-4">
                  {t(($) => $.enums.ProposalStatus[proposal.status])}
                  {page?.certified ? <CertifiedBadge /> : <SkeletonLoader width={100} />}
                </div>
              </div>
            </Link>
          )),
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
