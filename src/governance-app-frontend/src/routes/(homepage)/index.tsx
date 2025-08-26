import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useGovernanceListProposals } from '@hooks/canisters/governance/useGovernanceListProposals';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { isLoading, isError, error, data } = useGovernanceListProposals();
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  return (
    <div>
      <div className="text-2xl">
        {identity
          ? t(($) => $.home.yourPrincipal, {
              principal: identity?.getPrincipal().toString() ?? '',
            })
          : t(($) => $.common.login)}
      </div>

      <div className="mt-4">
        {isLoading && t(($) => $.home.loadingProposals)}
        {isError && t(($) => $.home.errorLoadingProposals, { error: error.message })}
        {data && (
          <>
            {data.response.proposals.map((proposal) => (
              <div key={proposal?.id?.toString()} className="pt-2">
                Proposal ID: {proposal?.id?.toString()} - Status: {proposal.status} - Name:{' '}
                {proposal.proposal?.title || 'No name provided'}
              </div>
            ))}
            {!data.response.proposals.length && <span>No proposals found.</span>}
            {data.certified && <CertifiedBadge />}
          </>
        )}
      </div>
    </div>
  );
}
