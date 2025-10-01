import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import useTitle from '@hooks/useTitle';

import { ProposalDetails } from './-ProposalDetails';
import { stringToBigInt } from '@utils/bigInts';

export const Route = createFileRoute('/nns/proposals/$id/')({
  component: ProposalDetailsWrapper,
  pendingComponent: () => <Skeleton count={3} />,
});

function ProposalDetailsWrapper() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  useTitle(t(($) => $.proposal.title));

  let validBigInt = stringToBigInt(id);

  if (!validBigInt) {
    return (
      <div className="mt-4 text-red-600">
        {t(($) => $.common.errorLoadingProposals, { error: 'Invalid proposal ID.' })}
      </div>
    );
  }
  return <ProposalDetails proposalId={validBigInt} />;
}
