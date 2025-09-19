import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceGetProposals } from '@hooks/canisters/governance/useGovernanceGetProposals';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/proposals/')({
  component: ProposalsPage,
});

function ProposalsPage() {
  const { isLoading, error, data, hasNextPage, fetchNextPage } = useGovernanceGetProposals();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  return (
    <div className="text-xl flex gap-2 flex-col">
      <div className="flex gap-2 mb-2">{t(($) => $.common.proposalsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.pages?.length && (
        <p className="text-sm font-bold text-orange-600">⚠️ {t(($) => $.common.noProposals)}</p>
      )}
      {error && t(($) => $.common.errorLoadingProposals, { error: error.message })}

      <div className="text-lg grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data?.pages?.map((page) =>
          page?.response.proposals.map((proposal) => (
            <Link
              params={{ id: proposal.id?.toString() ?? '' }}
              key={proposal.id?.toString()}
              to="/nns/proposals/$id"
            >
              <div
                style={{ backgroundColor: 'var(--background-color-secondary)' }}
                className="border p-4 rounded-lg h-full flex flex-col justify-between"
              >
                <p className="overflow-ellipsis overflow-hidden">
                  #{proposal.id?.toString()} {proposal.proposal?.title}
                </p>
                <div className="mt-4 flex items-end justify-between text-sm font-bold h-4">
                  {t(($) => $.enums.ProposalStatus[proposal.status])}
                  {page?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
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
