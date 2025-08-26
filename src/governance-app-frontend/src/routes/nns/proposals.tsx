import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useGovernanceListProposals } from '@hooks/canisters/governance/useGovernanceListProposals';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/proposals')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoading, isError, error, data } = useGovernanceListProposals();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  return (
    <div className="text-xl flex gap-2 flex-col">
      <div className="flex gap-2 mb-2">
        {t(($) => $.common.proposalsList)} {data?.certified && <CertifiedBadge />}
      </div>
      {isLoading && t(($) => $.common.loadingProposals)}
      {isError && t(($) => $.common.errorLoadingProposals, { error: error.message })}

      {data && (
        <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
          {data.response.proposals.map((proposal) => (
            <div key={proposal.id?.toString()} className="border p-2 rounded">
              #{proposal.id?.toString()} {proposal.proposal?.title}
              <p>
                <strong>{t(($) => $.enums.ProposalStatus[proposal.status])}</strong>
              </p>
            </div>
          ))}
          {!data.response.proposals.length && <span>{t(($) => $.common.noProposals)}</span>}
        </div>
      )}
    </div>
  );
}
