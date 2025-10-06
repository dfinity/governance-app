import { isNullish } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { WarningMessage } from '@components/extra/WarningMessage';
import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';

import { ProposalDetails } from './-ProposalDetails';

export const Route = createFileRoute('/nns/proposals/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  beforeLoad: ({ params }) => {
    if (!params.id) throw redirect({ to: '/nns/proposals', replace: true });
  },
  component: ProposalsIdIndex,
  pendingComponent: () => <Skeleton count={3} />,
});

function ProposalsIdIndex() {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.proposal.title));

  return isNullish(id) ? (
    <WarningMessage message={t(($) => $.common.loadingError)} />
  ) : (
    <ProposalDetails proposalId={id} />
  );
}
