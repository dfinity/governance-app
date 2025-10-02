import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';

import { ProposalDetails } from './-ProposalDetails';

export const Route = createFileRoute('/nns/proposals/$id/')({
  component: ProposalDetailsWrapper,
  pendingComponent: () => <Skeleton count={3} />,
});

function ProposalDetailsWrapper() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  useTitle(t(($) => $.proposal.title));

  const validBigInt = stringToBigInt(id);

  if (!validBigInt) {
    return <div className="mt-4 text-red-600">{t(($) => $.common.loadingError)}</div>;
  }
  return <ProposalDetails proposalId={validBigInt} />;
}
