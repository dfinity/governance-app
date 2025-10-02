import { isNullish } from '@dfinity/utils';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { WarningMessage } from '@components/extra/WarningMessage';
import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';

import { NeuronDetails } from './-NeuronDetails';

export const Route = createFileRoute('/nns/neurons/$id/')({
  component: NeuronDetailsWrapper,
  pendingComponent: () => <Skeleton count={3} />,
});

function NeuronDetailsWrapper() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsDetails, { neuronId: id }));

  const validId = stringToBigInt(id);

  console.log('validId', { id, validId });

  if (isNullish(validId)) {
    return <WarningMessage message={t(($) => $.neuron.errors.neuronNotFound, { neuronId: id })} />;
  }

  return <NeuronDetails neuronId={validId} />;
}
