import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SECONDS_IN_DAY } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS, ICP_MIN_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

import { Button } from '@/common/ui/button';
import { Input } from '@/common/ui/input';
import { Label } from '@/common/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/common/ui/responsive-dialog';

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
  const [open, setOpen] = useState(false);
  const [delayDaysInput, setDelayDays] = useState(dissolveDelayDays(neuron));
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canUpdate = nonNullish(governanceCanister) && governanceAuthenticated && governanceReady;
  const hint = inputError
    ? inputError
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
          setOpen(false);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const additionalDissolveDelaySeconds = Number(
      bigIntMul(BigInt(delayDaysInput), SECONDS_IN_DAY) - neuron.dissolveDelaySeconds,
    );

    if (additionalDissolveDelaySeconds <= 0) {
      setInputError(t(($) => $.neuron.setDissolveDelayModal.errors.decreasingDelay));
      return;
    }

    setDissolveDelayMutation.mutateAsync({ additionalDissolveDelaySeconds, neuron });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        {canUpdate ? (
          <Button size="sm" variant="outline">
            {t(($) => $.neuron.setDissolveDelay)}
          </Button>
        ) : (
          <></>
        )}
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.neuron.setDissolveDelayModal.title, {
                neuronId: neuron.neuronId.toString(),
              })}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.neuron.setDissolveDelayModal.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="delay-days">
              {t(($) => $.neuron.setDissolveDelayModal.delayLabel)}
            </Label>
            <Input
              id="delay-days"
              type="number"
              disabled={pending}
              required
              className={inputError ? 'border-destructive' : ''}
              value={delayDaysInput}
              onChange={(e) => handleDaysChange(e.target.value)}
            />
            <p className={`text-sm ${inputError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {hint}
            </p>
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t(($) => $.common.close)}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Confirming...' : t(($) => $.neuron.setDissolveDelayModal.actions.confirm)}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
