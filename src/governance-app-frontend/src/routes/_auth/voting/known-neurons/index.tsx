import { KnownNeuron, NeuronId, Topic } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { validateProposalsSearch } from '@features/proposals/utils';
import { KnownNeuronCard } from '@features/voting/components/KnownNeuronCard';
import { getUsersFollowedNeurons, isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';
import { isActiveKnownNeuron, sortKnownNeurons } from '@features/voting/utils/knownNeurons';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { warningNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

import i18n from '@/i18n/config';

const SUCCESS_AUTO_CLOSE_MS = 2400;

type DialogState =
  | { phase: 'closed' }
  | { phase: 'confirm'; neuron: KnownNeuron }
  | { phase: 'processing'; neuron: KnownNeuron }
  | { phase: 'success'; neuronName: string }
  | { phase: 'error'; neuron: KnownNeuron };

export const Route = createFileRoute('/_auth/voting/known-neurons/')({
  component: KnownNeuronsPage,
  validateSearch: validateProposalsSearch,
  head: () => {
    const title = i18n.t(($) => $.common.head.knownNeurons.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.voting',
  },
});

function KnownNeuronsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const queryClient = useQueryClient();

  const { canister } = useNnsGovernance();

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const userNeurons = neuronsQuery.data?.response;
  const knownNeurons = knownNeuronsQuery.data?.response;
  const followedNeurons =
    userNeurons && knownNeurons ? getUsersFollowedNeurons({ userNeurons, knownNeurons }) : [];
  const derivedSelectedId =
    followedNeurons.length === 1 && isKnownNeuron(followedNeurons[0])
      ? followedNeurons[0].id.toString()
      : null;

  const [userOverrideId, setUserOverrideId] = useState<string | null | undefined>(undefined);
  const selectedNeuronId = userOverrideId ?? derivedSelectedId;

  const [dialogState, setDialogState] = useState<DialogState>({ phase: 'closed' });
  const isDialogOpen = dialogState.phase !== 'closed';
  const isBlocking = dialogState.phase === 'processing';

  useEffect(() => {
    if (dialogState.phase !== 'success') return;
    const timer = setTimeout(() => setDialogState({ phase: 'closed' }), SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [dialogState]);

  const fireFollowMutation = useCallback(
    (knownNeuron: KnownNeuron) => {
      if (!neuronsQuery.data?.certified || !canister) return;
      const neurons = neuronsQuery.data.response;

      setDialogState({ phase: 'processing', neuron: knownNeuron });

      updateFollowingMutation.mutate({ neurons, knownNeuron });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [neuronsQuery.data, canister],
  );

  const updateFollowingMutation = useMutation<
    void[],
    Error,
    { neurons: { neuronId: NeuronId }[]; knownNeuron: KnownNeuron },
    { previousSelectedId: string | null }
  >({
    mutationFn: ({ neurons, knownNeuron }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      // Setting the following for topics `Unspecified`, `Governance` and `SNS and Community Fund` to cover all topics
      const knownNeuronId = knownNeuron.id;
      const promises = neurons.map((n) =>
        canister.setFollowing({
          neuronId: n.neuronId,
          topicFollowing: [
            {
              topic: Topic.Unspecified,
              followees: [knownNeuronId],
            },
            {
              topic: Topic.Governance,
              followees: [knownNeuronId],
            },
            {
              topic: Topic.SnsAndCommunityFund,
              followees: [knownNeuronId],
            },
          ],
        }),
      );

      return Promise.all(promises);
    },
    onMutate: (variables) => {
      const previousSelectedId = selectedNeuronId;
      setUserOverrideId(variables.knownNeuron.id.toString());
      return { previousSelectedId };
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      });

      setDialogState({ phase: 'success', neuronName: variables.knownNeuron.name });
    },
    onError: (error, variables, context) => {
      console.error('Failed to update neuron:', error);
      setUserOverrideId(context?.previousSelectedId ?? null);
      setDialogState({ phase: 'error', neuron: variables.knownNeuron });
    },
    retry: 3,
  });

  const handleRetry = () => {
    if (dialogState.phase !== 'error') return;
    fireFollowMutation(dialogState.neuron);
  };

  const handleSelect = (knownNeuron: KnownNeuron) => {
    if (!neuronsQuery.data?.certified || !canister) return;
    const neurons = neuronsQuery.data.response;
    const allKnownNeurons = knownNeuronsQuery.data?.response;

    if (neurons.length === 0) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }

    if (allKnownNeurons) {
      const currentFollowed = getUsersFollowedNeurons({
        userNeurons: neurons,
        knownNeurons: allKnownNeurons,
      });

      if (currentFollowed.length > 0) {
        setDialogState({ phase: 'confirm', neuron: knownNeuron });
        return;
      }
    }

    fireFollowMutation(knownNeuron);
  };

  const handleConfirm = () => {
    if (dialogState.phase !== 'confirm') return;
    fireFollowMutation(dialogState.neuron);
  };

  const closeDialog = () => setDialogState({ phase: 'closed' });

  const sortedKnownNeurons = knownNeurons?.filter(isActiveKnownNeuron).toSorted(sortKnownNeurons);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="link" asChild className="p-0! font-normal">
            <Link
              to="/voting"
              search={{
                showProposals: search.showProposals,
                proposalFilter: search.proposalFilter,
              }}
            >
              <ArrowLeft className="size-5" />
              {t(($) => $.proposal.backToProposals)}
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t(($) => $.knownNeurons.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.knownNeurons.description)}</p>
        </div>

        {followedNeurons.length > 1 && (
          <Alert variant="warning">
            <AlertTitle className="font-semibold">
              {t(($) => $.voting.warnings.followingMismatchTitle)}
            </AlertTitle>
            <AlertDescription>{t(($) => $.voting.warnings.followingMismatch)}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4">
          {knownNeuronsQuery.isLoading ? (
            <div className="flex items-center gap-4 p-4">
              <Skeleton className="h-6 w-6 rounded-2xl" />
              <Skeleton className="h-8 w-80 rounded" />
            </div>
          ) : knownNeuronsQuery.isError ? (
            <p className="text-destructive">{t(($) => $.common.loadingError)}</p>
          ) : sortedKnownNeurons?.length === 0 ? (
            <p className="text-muted-foreground">{t(($) => $.knownNeurons.empty)}</p>
          ) : (
            sortedKnownNeurons?.map((neuron, index) => (
              <motion.div
                key={neuron.id.toString()}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.06,
                  ease: 'easeOut',
                }}
              >
                <KnownNeuronCard
                  neuron={neuron}
                  isSelected={selectedNeuronId === neuron.id.toString()}
                  onSelect={handleSelect}
                  isLoading={
                    updateFollowingMutation.isPending &&
                    selectedNeuronId === neuron.id.toString()
                  }
                  isDisabled={
                    isNullish(canister) ||
                    updateFollowingMutation.isPending ||
                    !neuronsQuery.data?.certified
                  }
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={(open) => !open && !isBlocking && closeDialog()}
        dismissible={!isBlocking}
      >
        <ResponsiveDialogContent
          showCloseButton={!isBlocking}
          className="md:h-[200px] md:max-w-md"
        >
          <AnimatePresence mode="wait" initial={false}>
            {dialogState.phase === 'confirm' && (
              <motion.div
                key="confirm"
                className="flex h-full flex-col justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>
                    {t(($) => $.knownNeurons.confirmation.title)}
                  </ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    {t(($) => $.knownNeurons.confirmation.description)}
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ResponsiveDialogFooter className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeDialog}>
                    {t(($) => $.common.cancel)}
                  </Button>
                  <Button onClick={handleConfirm}>
                    {t(($) => $.common.confirm)}
                  </Button>
                </ResponsiveDialogFooter>
              </motion.div>
            )}

            {dialogState.phase === 'processing' && (
              <motion.div
                key="processing"
                className="flex h-full flex-col items-center justify-center gap-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  className="flex size-16 items-center justify-center rounded-full bg-primary/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <Loader className="size-8 animate-spin text-primary" />
                </motion.div>
                <motion.p
                  className="text-sm font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {t(($) => $.knownNeurons.api.processing, {
                    name: dialogState.neuron.name,
                  })}
                </motion.p>
              </motion.div>
            )}

            {dialogState.phase === 'success' && (
              <motion.div
                key="success"
                className="flex h-full flex-col items-center justify-center gap-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="flex size-16 items-center justify-center rounded-full bg-green-600/10"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <AnimatedCheckmark />
                </motion.div>
                <motion.p
                  className="max-w-xs text-sm font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  {t(($) => $.knownNeurons.api.success, {
                    name: dialogState.neuronName,
                  })}
                </motion.p>
              </motion.div>
            )}

            {dialogState.phase === 'error' && (
              <motion.div
                key="error"
                className="flex h-full flex-col items-center justify-between text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <motion.div
                    className="flex size-14 items-center justify-center rounded-full bg-destructive/10"
                    initial={{ scale: 0.8, rotate: 0 }}
                    animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    <AlertTriangle className="size-8 text-destructive" />
                  </motion.div>
                  <motion.p
                    className="max-w-xs text-sm font-medium text-muted-foreground"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {t(($) => $.knownNeurons.api.error, {
                      name: dialogState.neuron.name,
                    })}
                  </motion.p>
                </div>
                <div className="flex w-full gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={closeDialog}>
                    {t(($) => $.common.close)}
                  </Button>
                  <Button className="flex-1" onClick={handleRetry}>
                    {t(($) => $.knownNeurons.api.retry)}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function AnimatedCheckmark() {
  return (
    <motion.svg
      className="size-12 text-green-600 dark:text-green-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}
