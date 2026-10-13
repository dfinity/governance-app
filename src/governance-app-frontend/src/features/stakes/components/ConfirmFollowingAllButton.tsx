import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Spinner } from '@components/Spinner';
import { mapCanisterError } from '@utils/errors';
import { isUserController } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useRefreshVotingPowerForNeurons } from '../hooks/useRefreshVotingPowerForNeurons';

type Props = {
  neurons: NeuronInfo[];
};

/**
 * Confirms following on each neuron that the user controls. Neurons where the
 * user is only a hotkey are not included. Renders nothing if the user controls
 * no neuron.
 */
export function ConfirmFollowingAllButton({ neurons }: Props) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const { mutateAsync, isPending } = useRefreshVotingPowerForNeurons();

  const principalId = identity?.getPrincipal().toText();
  const neuronIds = neurons
    .filter((neuron) => isUserController({ neuron, principalId }))
    .map((neuron) => neuron.neuronId);

  if (neuronIds.length === 0) return null;

  const handleConfirm = async () => {
    try {
      await mutateAsync({ neuronIds });
      successNotification({
        description: t(($) => $.neuron.followingStatus.successAll),
      });
    } catch (err) {
      errorNotification({
        description: mapCanisterError(err as Error),
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="xl"
      className="w-full sm:w-auto"
      onClick={handleConfirm}
      disabled={isPending}
      data-testid="confirm-following-all-btn"
    >
      {isPending ? (
        <>
          <Spinner />
          {t(($) => $.neuron.followingStatus.processing)}
        </>
      ) : (
        <>
          <CheckCheck />
          {t(($) => $.neuron.followingStatus.ctaAll)}
        </>
      )}
    </Button>
  );
}
