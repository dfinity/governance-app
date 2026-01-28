import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { IS_TESTNET, U64_MAX } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  neuron: NeuronInfo;
};

export const UnlockNeuronModal = ({ neuron }: Props) => {
  if (!IS_TESTNET) throw errorMessage('unlockNeuronModal', 'the environment is not "testnet"');

  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    ready: governanceTestReady,
    canister: governanceTestCanister,
    authenticated: governanceTestAuthenticated,
  } = useNnsGovernanceTest();

  const [open, setOpen] = useState(false);
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
            description: t(($) => $.devActionsModal.unlockStake.success),
          });
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUnlockNeuronMutation.mutate();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        {canUpdate ? (
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-4 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
          >
            {t(($) => $.devActionsModal.unlockStake.title)}
          </Button>
        ) : (
          <></>
        )}
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.devActionsModal.unlockStake.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.devActionsModal.unlockStake.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogFooter className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t(($) => $.devActionsModal.common.close)}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(($) => $.devActionsModal.unlockStake.confirming)}
                </>
              ) : (
                t(($) => $.devActionsModal.unlockStake.confirm)
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
