import { NeuronInfo } from '@dfinity/nns';
import { nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/components';
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from '@untitledui/components/application/modals/modal';
import { Input } from '@untitledui/components/base/input/input';

import { SECONDS_IN_DAY } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS, ICP_MIN_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { bigIntDiv, bigIntMul } from '@utils/bigInts';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/queryKeys';

type Props = {
  neuron: NeuronInfo;
};

const dissolveDelayDays = (neuron: NeuronInfo): string => {
  return bigIntDiv(neuron.dissolveDelaySeconds, BigInt(SECONDS_IN_DAY)).toString();
};

export const SetDissolveDelayModal = ({ neuron }: Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    ready: governanceReady,
    canister: governanceCanister,
    authenticated: governanceAuthenticated,
  } = useNnsGovernance();
  const [delayDaysInput, setDelayDays] = useState(dissolveDelayDays(neuron));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canUpdate = nonNullish(governanceCanister) && governanceAuthenticated && governanceReady;
  const hint = error
    ? error
    : t(($) => $.neuron.setDissolveDelayModal.hint, {
        min: Math.ceil(ICP_MIN_DISSOLVE_DELAY_SECONDS / SECONDS_IN_DAY),
        max: Math.floor(ICP_MAX_DISSOLVE_DELAY_SECONDS / SECONDS_IN_DAY),
      });

  const setDissolveDelayMutation = useMutation<
    void,
    Error,
    { additionalDissolveDelaySeconds: number; neuron: NeuronInfo }
  >({
    mutationFn: async ({ additionalDissolveDelaySeconds, neuron }) => {
      return governanceCanister!.increaseDissolveDelay({
        neuronId: neuron.neuronId,
        additionalDissolveDelaySeconds,
      });
    },
    onMutate: () => {
      setPending(true);
      setError(null);
    },
    onSuccess: (_, { neuron, additionalDissolveDelaySeconds }) => {
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
    },
    onError: (mutationError) => {
      console.error('Set dissolve delay error', mutationError);

      setError(mapGovernanceCanisterError(mutationError));
      setPending(false);
    },
  });

  const handleDaysChange = (value: string) => {
    setDelayDays(value);
    setDissolveDelayMutation.reset();
    setError(null);
  };

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const additionalDissolveDelaySeconds = Number(
      bigIntMul(BigInt(delayDaysInput), SECONDS_IN_DAY) - neuron.dissolveDelaySeconds,
    );

    if (additionalDissolveDelaySeconds <= 0) {
      setError(t(($) => $.neuron.setDissolveDelayModal.errors.decreasingDelay));
      return;
    }

    setDissolveDelayMutation.mutateAsync({ additionalDissolveDelaySeconds, neuron }).then(() => {
      close();
    });
  };

  return (
    <DialogTrigger>
      {canUpdate && (
        <Button slot="trigger" color="secondary" size="sm">
          {t(($) => $.neuron.setDissolveDelay)}
        </Button>
      )}

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-md rounded-2xl bg-primary p-6 shadow-lg'}>
          <Dialog
            aria-label={t(($) => $.neuron.setDissolveDelayModal.title, {
              neuronId: neuron.neuronId.toString(),
            })}
          >
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {t(($) => $.neuron.setDissolveDelayModal.title, {
                      neuronId: neuron.neuronId.toString(),
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-secondary">
                    {t(($) => $.neuron.setDissolveDelayModal.description)}
                  </p>
                </div>

                <Input
                  type="number"
                  isDisabled={pending}
                  isRequired
                  isInvalid={nonNullish(error)}
                  hint={hint}
                  value={delayDaysInput}
                  onChange={handleDaysChange}
                  label={t(($) => $.neuron.setDissolveDelayModal.delayLabel)}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" color="secondary" onClick={close} isDisabled={pending}>
                    {t(($) => $.neuron.setDissolveDelayModal.actions.cancel)}
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
