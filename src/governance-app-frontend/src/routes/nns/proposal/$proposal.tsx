import { ProposalInfo } from '@dfinity/nns';
import { UseQueryResult } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useGovernanceGetProposal } from '@common/hooks/canisters/governance/useGovernanceGetProposal';
import { CertifiedData } from '@common/queries/useQueryThenUpdateCall';
import { jsonReplacer } from '@dfinity/utils';

type LoaderParams = {
  proposal?: string;
};

export const Route = createFileRoute('/nns/proposal/$proposal')({
  component: ProposalDetailsIndex,
  pendingComponent: () => 'Loading...',
  loader: async ({ params }) => {
    const res = await new Promise<LoaderParams>((resolve) => {
      console.log('params:', params);

      setTimeout(() => {
        resolve({ proposal: params.proposal });
      }, 1000);
    });
    return res;
  },
});

function ProposalDetailsIndex() {
  const { proposal } = Route.useLoaderData();
  const stringToBigInt = (proposalId: string | undefined): bigint | undefined =>
    proposalId && /^\d+$/.test(proposalId) ? BigInt(proposalId) : undefined;
  const {
    isLoading,
    isError,
    error,
    data,
  }: UseQueryResult<CertifiedData<ProposalInfo>, Error> = useGovernanceGetProposal({
    proposalId: stringToBigInt(proposal),
  });
  const { t } = useTranslation();

  return (
    <div>
      <h1>Proposal({proposal}) info</h1>

      <div className="mt-4">
        {isLoading && t(($) => $.home.loadingProposals)}
        {isError && t(($) => $.home.errorLoadingProposals, { error: error.message })}
        {data && (
          <>
            {JSON.stringify(data.response, jsonReplacer)}
            {data.certified && <CertifiedBadge />}
          </>
        )}
      </div>
    </div>
  );
}
