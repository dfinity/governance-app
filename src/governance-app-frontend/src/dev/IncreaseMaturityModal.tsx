import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { DIALOG_RESET_DELAY_MS, E8S, IS_TESTNET } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

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

  const neuronId = neuron.neuronId.toString();
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setAdditionalMaturity('');
      setValidationError(null);
    }, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const mutation = useMutation({
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
    onSuccess: async () => {
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
  });

  const handleSubmit =
    (execute: (fn: () => Promise<unknown>) => void) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const numericValue = Number(additionalMaturity);
      if (numericValue <= 0) {
        setValidationError(t(($) => $.devActionsModal.increaseMaturity.errors.amountTooLow));
        return;
      }

      execute(() => mutation.mutateAsync());
    };

  if (!canUpdate) return null;

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="h-auto py-4 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
        onClick={() => setOpen(true)}
      >
        {t(($) => $.devActionsModal.increaseMaturity.title)}
      </Button>

      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={t(($) => $.devActionsModal.increaseMaturity.confirming)}
        successMessage={t(($) => $.devActionsModal.increaseMaturity.success, {
          amount: additionalMaturity,
        })}
        navBlockerDescription={t(($) => $.devActionsModal.increaseMaturity.confirming)}
      >
        {({ execute, close }) => (
          <form onSubmit={handleSubmit(execute)} className="flex min-h-0 flex-1 flex-col">
            <MutationDialogHeader>
              <ResponsiveDialogTitle>
                {t(($) => $.devActionsModal.increaseMaturity.title)}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t(($) => $.devActionsModal.increaseMaturity.description)}
              </ResponsiveDialogDescription>
            </MutationDialogHeader>

            <MutationDialogBody className="space-y-4 px-4 py-4 md:px-0">
              <div className="space-y-1">
                <Label htmlFor="maturity-input">
                  {t(($) => $.devActionsModal.increaseMaturity.amountLabel)}
                </Label>
                <Input
                  id="maturity-input"
                  className="h-14 [appearance:textfield] border-2 !text-lg font-semibold focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => {
                    setAdditionalMaturity(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="0.00"
                  ref={inputRef}
                  value={additionalMaturity}
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
            </MutationDialogBody>

            <MutationDialogFooter className="md:justify-end">
              <Button type="button" variant="ghost" onClick={close}>
                {t(($) => $.devActionsModal.common.close)}
              </Button>
              <Button type="submit">{t(($) => $.devActionsModal.increaseMaturity.confirm)}</Button>
            </MutationDialogFooter>
          </form>
        )}
      </MutationDialog>
    </>
  );
};
