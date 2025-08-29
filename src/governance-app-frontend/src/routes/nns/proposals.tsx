import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceListProposals } from '@hooks/canisters/governance/useGovernanceListProposals';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/proposals')({
  component: ProposalsPage,
});

function ProposalsPage() {
  const { isLoading, isError, error, data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGovernanceListProposals();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  useEffect(() => {
    if (hasNextPage) {
      fetchNextPage();
    }
  }, [data, hasNextPage, fetchNextPage]);

  return (
    <div className="text-xl flex gap-2 flex-col">
      <div className="flex gap-2 mb-2">{t(($) => $.common.proposalsList)}</div>
      {isError && t(($) => $.common.errorLoadingProposals, { error: error.message })}
      {isLoading && <SkeletonLoader count={3} />}

      {data && (
        <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 text-lg">
          {data.pages.map((page) =>
            page?.response.proposals.map((proposal) => (
              <div
                key={proposal.id?.toString()}
                className="border p-4 rounded-lg"
                style={{ backgroundColor: 'var(--background-color-secondary)' }}
              >
                #{proposal.id?.toString()} {proposal.proposal?.title}
                <div className="mt-4 flex items-end justify-between text-sm font-bold h-[20px]">
                  {t(($) => $.enums.ProposalStatus[proposal.status])}
                  {page?.certified ? <CertifiedBadge /> : <SkeletonLoader width={100} />}
                </div>
              </div>
            )),
          )}
          {isFetchingNextPage && <SkeletonLoader count={3} />}
          {!isLoading && !data.pages.length && <span>{t(($) => $.common.noProposals)}</span>}
        </div>
      )}
    </div>
  );
}
