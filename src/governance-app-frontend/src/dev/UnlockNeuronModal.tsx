import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { Button, Dialog, DialogTrigger, Modal, ModalOverlay } from '@ui';

import { IS_TESTNET, U64_MAX } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/canisters/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const UnlockNeuronModal = ({ neuron }: Props) => {
  if (!IS_TESTNET) throw errorMessage('unlockNeuronModal', 'the environment is not "testnet"');

  const queryClient = useQueryClient();

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [pending, setPending] = useState(false);
  const neuronId = neuron.neuronId.toString();
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;

  const setUnlockNeuronMutation = useMutation({
    mutationFn: () => {
      if (isNullish(neuron.fullNeuron)) {
        throw new Error(`Full neuron is not defined for neuron #${neuronId}.`);
      }

      return governanceTestCanister!.updateNeuron({
        ...neuron.fullNeuron,
        dissolveState: { WhenDissolvedTimestampSeconds: 0n },
        // Backend requirement: https://github.com/dfinity/ic/blob/a00685bd42a1d33e7c8c821b0216cb83f8e6f798/rs/nns/governance/src/neuron/types.rs#L1692
        agingSinceTimestampSeconds: U64_MAX,
      });
    },
    onMutate: () => setPending(true),
    onSuccess: () =>
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .then(() => {
          successNotification({
            description: `You have successfully unlocked neuron #${neuronId}.`,
          });
          setPending(false);
        }),
    onError: () => {
      setPending(false);
      errorNotification({
        description: `Failed to unlock neuron #${neuronId}.`,
      });
    },
  });

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUnlockNeuronMutation.mutateAsync().then(close);
  };

  return (
    <DialogTrigger>
      {canUpdate && (
        <Button slot="trigger" color="secondary" size="sm">
          Unlock neuron
        </Button>
      )}

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-sm rounded-2xl p-6 shadow-lg'}>
          <Dialog>
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <div>
                  <h3 className="text-lg font-semibold">Unlock neuron #{neuronId}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Unlock the neuron. Available only in TESTNET.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" color="secondary" onClick={close} isDisabled={pending}>
                    Close
                  </Button>
                  <Button type="submit" color="primary" isLoading={pending}>
                    Confirm
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};
