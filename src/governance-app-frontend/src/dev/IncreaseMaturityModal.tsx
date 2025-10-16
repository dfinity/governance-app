import { NeuronInfo } from '@dfinity/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { Button, Dialog, DialogTrigger, Input, Modal, ModalOverlay } from '@untitledui/components';

import { SECONDS_IN_DAY } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/canisters/governance/useGovernanceTest';
import { bigIntDiv } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const IncreaseMaturityModal = ({ neuron }: Props) => {
  const queryClient = useQueryClient();

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [additionalMaturity, setAdditionalMaturity] = useState(maturityDays(neuron));
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;

  const setIncreaseMaturityMutation = useMutation({
    mutationFn: () => {
      if (isNullish(neuron.fullNeuron)) {
        throw new Error(`Full neuron is not defined for neuron ${neuron.neuronId}.`);
      }

      return governanceTestCanister!.updateNeuron({
        ...neuron.fullNeuron,
        maturityE8sEquivalent: neuron.fullNeuron?.maturityE8sEquivalent || 0n,
      });
    },
    onMutate: () => setPending(true),
    onSuccess: () => {
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .finally(() => {
          const expectedDissolveDelaySeconds =
            neuron.dissolveDelaySeconds + BigInt(additionalDissolveDelaySeconds);
          setDelayDays(bigIntDiv(expectedDissolveDelaySeconds, BigInt(SECONDS_IN_DAY)).toString());
          setPending(false);
        });
      successNotification({
        description: t(($) => $.neuron.setDissolveDelayModal.success, { amount: delayDaysInput }),
      });
    },
    onError: (mutationError) => {
      setPending(false);
      errorNotification({
        description: mapGovernanceCanisterError(mutationError),
      });
    },
  });

  const handleMaturityChange = (value: string) => {
    setAdditionalMaturity(value);
    setInputError(null);
    if (!value) return;
    const numericValue = Number(value);
    if (numericValue <= 0) {
      setInputError(t(($) => $.neuron.increaseMaturityModal.errors.invalidMaturity));
    }
  };

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIncreaseMaturityMutation.mutate();
    close();
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
                    Increase maturity for {neuron.neuronId.toString()}
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
                  <Button type="submit" color="primary" isDisabled={pending}>
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
