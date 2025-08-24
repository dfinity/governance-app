import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useGovernanceListProposals } from '@common/hooks/canisters/governance/useGovernanceListProposals';
import { useIcpLedgerMetadata } from '@common/hooks/canisters/icpLedger/useIcpLedgerMetadata';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const metadata = useIcpLedgerMetadata();
  const proposals = useGovernanceListProposals();

  return (
    <div>
      <div className="text-2xl">
        {identity ? (
          <>
            {t(($) => $.home.yourPrincipal, {
              principal: identity?.getPrincipal().toString() ?? '',
            })}
          </>
        ) : (
          <>{t(($) => $.common.login)}</>
        )}
      </div>
      <div className="pt-4">
        {metadata.isLoading && <p>Loading...</p>}
        {metadata.isError && <p>Error: {metadata.error.message}</p>}
        {metadata.data && (
          <p className="flex items-center gap-2 h-8">
            {metadata.data.data}{' '}
            {metadata.data.certified && (
              <span className="bg-green-200 text-green-900 font-bold text-sm uppercase px-2 py-1 rounded">
                ✅ certified
              </span>
            )}
          </p>
        )}
      </div>
      <ul>
        {proposals.isLoading && <p>Loading proposals...</p>}
        {proposals.isError && <p>Error: {proposals.error.message}</p>}
        {proposals.data &&
          proposals.data.data.proposals.map((proposal) => (
            <li key={proposal?.id?.toString()} className="pt-2">
              Proposal ID: {proposal?.id?.toString()} - Status: {proposal.status} - Name:{' '}
              {proposal.proposal?.title || 'No name provided'}
            </li>
          ))}
        {proposals.data && proposals.data.data.proposals.length === 0 && (
          <li>No proposals found.</li>
        )}
      </ul>
    </div>
  );
}
