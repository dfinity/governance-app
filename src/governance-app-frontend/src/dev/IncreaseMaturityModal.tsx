import { isNullish, nonNullish } from '@dfinity/utils';
import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { Button } from '@components/button';
import { Input } from '@components/input';
import { Label } from '@components/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/responsive-dialog';
import { E8S, IS_TESTNET } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/governance/useGovernanceTest';
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

  const [open, setOpen] = useState(false);
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
          setOpen(false);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIncreaseMaturityMutation.mutate();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        {canUpdate ? (
          <Button variant="outline" size="sm">
            Increase maturity
          </Button>
        ) : (
          <></>
        )}
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Increase maturity for #{neuronId}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Manually increase the maturity of your neuron. Available only in TESTNET.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="maturity-input">Maturity to add:</Label>
            <Input
              id="maturity-input"
              className={nonNullish(inputError) ? 'border-destructive' : ''}
              onChange={(e) => handleMaturityChange(e.target.value)}
              value={additionalMaturity}
              disabled={pending}
              type="number"
              required
            />
            {inputError && <p className="text-sm text-destructive">{inputError}</p>}
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Confirming...' : 'Confirm'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
