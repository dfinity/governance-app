import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import useTitle from '@hooks/useTitle';

import { ProposalDetails } from './-ProposalDetails';

export const Route = createFileRoute('/nns/proposals/$id/')({
  component: ProposalDetailsWrapper,
  pendingComponent: () => <Skeleton count={3} />,
});

function ProposalDetailsWrapper() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  useTitle(t(($) => $.proposal.title));

  // Validate Id can be converted to BigInt.
  let validBigInt: bigint | undefined;
  try {
    if (id && /^\d+$/.test(id)) {
      validBigInt = BigInt(id);
    }
  } catch (e) {
    console.error('Invalid proposal ID:', e);
    validBigInt = undefined;
  }

  if (!validBigInt) {
    return (
      <div className="mt-4 text-red-600">
        {t(($) => $.common.loadingError, { error: 'Invalid proposal ID.' })}
      </div>
    );
  }
  return <ProposalDetails proposalId={validBigInt} />;
}
