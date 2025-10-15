import { NeuronInfo } from '@dfinity/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogTrigger, Input, Modal, ModalOverlay } from '@untitledui/components';

import { SECONDS_IN_DAY } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS, ICP_MIN_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { useNnsGovernanceTest } from '@hooks/canisters/governance/useGovernanceTest';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const IncreaseMaturityModal = ({ neuron }: Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [delayDaysInput, setDelayDays] = useState(dissolveDelayDays(neuron));
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;
  const hint = inputError
    ? inputError
    : t(($) => $.neuron.setDissolveDelayModal.hint, {
        min: Math.ceil(ICP_MIN_DISSOLVE_DELAY_SECONDS / SECONDS_IN_DAY),
        max: Math.floor(ICP_MAX_DISSOLVE_DELAY_SECONDS / SECONDS_IN_DAY),
      });

  const setDissolveDelayMutation = useMutation({
    mutationFn: () => {
      if (isNullish(neuron.fullNeuron)) {
        throw new Error(`Full neuron is not defined for neuron ${neuron.neuronId}.`);
      }

      return governanceTestCanister!.updateNeuron({
        ...neuron.fullNeuron,
        maturityE8sEquivalent: neuron.fullNeuron?.maturityE8sEquivalent || 0n,
      });
    },
    onMutate: () => {
      setPending(true);
    },
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

  const handleDaysChange = (value: string) => {
    setDelayDays(value);
    setDissolveDelayMutation.reset();
    setInputError(null);
  };

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const additionalDissolveDelaySeconds = Number(
      bigIntMul(BigInt(delayDaysInput), SECONDS_IN_DAY) - neuron.dissolveDelaySeconds,
    );

    if (additionalDissolveDelaySeconds <= 0) {
      setInputError(t(($) => $.neuron.setDissolveDelayModal.errors.decreasingDelay));
      return;
    }

    setDissolveDelayMutation.mutateAsync({ additionalDissolveDelaySeconds, neuron }).then(close);
  };

  return (
    <DialogTrigger>
      {canUpdate && (
        <Button slot="trigger" color="secondary" size="sm">
          {t(($) => $.neuron.increaseMaturity)}
        </Button>
      )}

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-md rounded-2xl bg-primary p-6 shadow-lg'}>
          <Dialog
            aria-label={t(($) => $.neuron.increaseMaturityModal.title, {
              neuronId: neuron.neuronId.toString(),
            })}
          >
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {t(($) => $.neuron.increaseMaturityModal.title, {
                      neuronId: neuron.neuronId.toString(),
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-secondary">
                    {t(($) => $.neuron.increaseMaturityModal.description)}
                  </p>
                </div>

                <Input
                  label={t(($) => $.neuron.setDissolveDelayModal.delayLabel)}
                  isInvalid={nonNullish(inputError)}
                  onChange={handleDaysChange}
                  value={delayDaysInput}
                  isDisabled={pending}
                  type="number"
                  hint={hint}
                  isRequired
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" color="secondary" onClick={close} isDisabled={pending}>
                    {t(($) => $.common.close)}
                  </Button>
                  <Button type="submit" color="primary" isDisabled={pending}>
                    {t(($) => $.neuron.setDissolveDelayModal.actions.confirm)}
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
