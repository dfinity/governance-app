import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { E8S, IS_TESTNET } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const IncreaseMaturityModal = ({ neuron }: Props) => {
  if (!IS_TESTNET) throw errorMessage('increaseMaturityModal', 'the environment is not "testnet"');

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [open, setOpen] = useState(false);
  const [additionalMaturity, setAdditionalMaturity] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when modal closes
      setAdditionalMaturity('');
      setValidationError(null);
    }
  };
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
          successNotification({
            description: t(($) => $.devActionsModal.increaseMaturity.success, {
              amount: additionalMaturity,
            }),
          });
          setAdditionalMaturity('');
          setPending(false);
          setOpen(false);
        }),
    onError: (error) => {
      setPending(false);
      errorNotification({
        description: mapCanisterError(error),
      });
    },
  });

  const handleMaturityChange = (value: string) => {
    setAdditionalMaturity(value);
    setValidationError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericValue = Number(additionalMaturity);
    if (numericValue <= 0) {
      setValidationError(t(($) => $.devActionsModal.increaseMaturity.errors.amountTooLow));
      return;
    }

    setIncreaseMaturityMutation.mutate();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        {canUpdate ? (
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-4 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
          >
            {t(($) => $.devActionsModal.increaseMaturity.title)}
          </Button>
        ) : (
          <></>
        )}
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.devActionsModal.increaseMaturity.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.devActionsModal.increaseMaturity.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="maturity-input">
                {t(($) => $.devActionsModal.increaseMaturity.amountLabel)}
              </Label>
              <Input
                id="maturity-input"
                className="h-14 [appearance:textfield] border-2 !text-lg font-semibold focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => handleMaturityChange(e.target.value)}
                placeholder="0.00"
                ref={inputRef}
                value={additionalMaturity}
                disabled={pending}
                type="number"
                inputMode="decimal"
                step="any"
              />
            </div>

            {validationError && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {t(($) => $.devActionsModal.common.close)}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(($) => $.devActionsModal.increaseMaturity.confirming)}
                </>
              ) : (
                t(($) => $.devActionsModal.increaseMaturity.confirm)
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
