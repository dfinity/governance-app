import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Spinner } from '@components/Spinner';
import { useGovernanceEconomics } from '@hooks/governance/useGovernanceEconomics';
import { mapCanisterError } from '@utils/errors';
import { getFollowingHealth, isUserController } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useRefreshVotingPowerForNeurons } from '../hooks/useRefreshVotingPowerForNeurons';

type Props = {
  neurons: NeuronInfo[];
};

/**
 * Confirms following on each neuron that the user controls. It skips:
 * - neurons where the user is only a hotkey.
 * - expired neurons, because a refresh does not restore cleared followees.
 * - neurons with an unknown health (for example, before economics load), because
 *   they can be expired.
 *
 * Renders nothing if no neuron is left.
 */
export function ConfirmFollowingAllButton({ neurons }: Props) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const economicsQuery = useGovernanceEconomics();
  const economics = economicsQuery.data?.response?.votingPowerEconomics ?? undefined;
  const { mutateAsync, isPending } = useRefreshVotingPowerForNeurons();

  const principalId = identity?.getPrincipal().toText();
  const neuronIds = neurons
    .filter((neuron) => {
      const health = getFollowingHealth(neuron, economics);
      return isUserController({ neuron, principalId }) && !!health && health !== 'expired';
    })
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
