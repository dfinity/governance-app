import { isNullish } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { WarningMessage } from '@components/extra/WarningMessage';
import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';

import { NeuronDetails } from './-NeuronDetails';

export const Route = createFileRoute('/nns/neurons/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  beforeLoad: ({ params }) => {
    if (!params.id) throw redirect({ to: '/nns/neurons', replace: true });
  },
  pendingComponent: () => <Skeleton count={3} />,
  component: NeuronsIdIndex,
});

function NeuronsIdIndex() {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.common.neuronsDetails, { neuronId: id }));

  return isNullish(id) ? (
    <WarningMessage message={t(($) => $.common.loadingError)} />
  ) : (
    <NeuronDetails neuronId={id} />
  );
}
