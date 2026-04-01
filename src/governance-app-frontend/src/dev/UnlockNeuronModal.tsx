import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  MutationDialog,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { IS_TESTNET, U64_MAX } from '@constants/extra';
import { useNnsGovernanceTest } from '@hooks/governance/useGovernanceTest';
import { errorMessage } from '@utils/error';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

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
  const neuronId = neuron.neuronId.toString();
  const canUpdate =
    nonNullish(governanceTestCanister) && governanceTestAuthenticated && governanceTestReady;

  const mutation = useMutation({
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
    onSuccess: async () => {
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
  });

  const handleSubmit =
    (execute: (fn: () => Promise<unknown>) => void) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
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
        {t(($) => $.devActionsModal.unlockStake.title)}
      </Button>

      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={t(($) => $.devActionsModal.unlockStake.confirming)}
        successMessage={t(($) => $.devActionsModal.unlockStake.success)}
        navBlockerDescription={t(($) => $.devActionsModal.unlockStake.confirming)}
      >
        {({ execute, close }) => (
          <form onSubmit={handleSubmit(execute)} className="flex min-h-0 flex-1 flex-col">
            <MutationDialogHeader>
              <ResponsiveDialogTitle>
                {t(($) => $.devActionsModal.unlockStake.title)}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t(($) => $.devActionsModal.unlockStake.description)}
              </ResponsiveDialogDescription>
            </MutationDialogHeader>

            <MutationDialogFooter className="md:justify-end">
              <Button type="button" variant="ghost" onClick={close}>
                {t(($) => $.devActionsModal.common.close)}
              </Button>
              <Button type="submit">{t(($) => $.devActionsModal.unlockStake.confirm)}</Button>
            </MutationDialogFooter>
          </form>
        )}
      </MutationDialog>
    </>
  );
};
