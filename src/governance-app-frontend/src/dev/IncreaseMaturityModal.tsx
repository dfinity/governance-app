import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { Button, Dialog, DialogTrigger, Input, Modal, ModalOverlay } from '@untitledui/components';

import { E8S, IS_TESTNET } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/canisters/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const IncreaseMaturityModal = ({ neuron }: Props) => {
  if (!IS_TESTNET) throw errorMessage('increaseMaturityModal', 'the environment is not "testnet"');

  const queryClient = useQueryClient();

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [additionalMaturity, setAdditionalMaturity] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const neuronId = neuron.neuronId.toString();
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;

  const setIncreaseMaturityMutation = useMutation({
    mutationFn: () => {
      if (isNullish(neuron.fullNeuron)) {
        throw new Error(`Full neuron is not defined for neuron #${neuronId}.`);
      }

      return governanceTestCanister!.updateNeuron({
        ...neuron.fullNeuron,
        maturityE8sEquivalent:
          (neuron.fullNeuron?.maturityE8sEquivalent || 0n) +
          BigInt(Number(additionalMaturity) * E8S),
      });
    },
    onMutate: () => setPending(true),
    onSuccess: () =>
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .then(() => {
          setAdditionalMaturity('');
          successNotification({
            description: `You have successfully added ${additionalMaturity} maturity to neuron #${neuronId}.`,
          });
          setPending(false);
        }),
    onError: () => {
      setPending(false);
      errorNotification({
        description: `Failed to increase maturity for neuron #${neuronId}.`,
      });
    },
  });

  const handleMaturityChange = (value: string) => {
    setAdditionalMaturity(value);
    setInputError(null);
    if (!value) return;
    const numericValue = Number(value);
    if (numericValue <= 0) {
      setInputError('Additional maturity must be greater than 0.');
    }
  };

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIncreaseMaturityMutation.mutateAsync().then(close);
  };

  return (
    <DialogTrigger>
      {canUpdate && (
        <Button slot="trigger" color="secondary" size="sm">
          Increase maturity
        </Button>
      )}

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-md rounded-2xl bg-primary p-6 shadow-lg'}>
          <Dialog>
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    Increase maturity for #{neuronId}
                  </h3>
                  <p className="mt-1 text-sm text-secondary">
                    Manually increase the maturity of your neuron. Available only in TESTNET.
                  </p>
                </div>

                <Input
                  label={'Maturity to add:'}
                  isInvalid={nonNullish(inputError)}
                  onChange={handleMaturityChange}
                  value={additionalMaturity}
                  isDisabled={pending}
                  hint={inputError}
                  type="number"
                  isRequired
                />

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
