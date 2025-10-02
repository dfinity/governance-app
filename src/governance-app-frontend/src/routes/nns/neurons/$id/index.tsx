import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { WarningMessage } from '@components/extra/WarningMessage';
import useTitle from '@hooks/useTitle';

import { NeuronDetails } from './-NeuronDetails';
import { stringToBigInt } from '@utils/bigInts';
import { isNullish } from '@dfinity/utils';

export const Route = createFileRoute('/nns/neurons/$id/')({
  component: NeuronDetailsWrapper,
  pendingComponent: () => <Skeleton count={3} />,
});

function NeuronDetailsWrapper() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsList));

  // max: const?
  const validId = stringToBigInt(id);

  if (isNullish(validId)) {
    return (
      <WarningMessage
        message={t(($) => $.common.errorLoadingNeurons, { error: 'Invalid neuron ID.' })}
      />
    );
  }

  return <NeuronDetails neuronId={validId} />;
}
