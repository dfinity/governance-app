import { KnownNeuron, NeuronId } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { validateProposalsSearch } from '@features/proposals/utils';
import { KnownNeuronCard } from '@features/voting/components/KnownNeuronCard';
import { getUsersFollowedNeurons, isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';
import {
  buildKnownNeuronTopicFollowing,
  isActiveKnownNeuron,
  sortKnownNeurons,
} from '@features/voting/utils/knownNeurons';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
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
import { SUCCESS_AUTO_CLOSE_MS } from '@constants/extra';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { warningNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

import i18n from '@/i18n/config';

enum DialogPhase {
  Closed = 'closed',
  Confirm = 'confirm',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

type DialogState =
  | { phase: DialogPhase.Closed }
  | { phase: DialogPhase.Confirm; neuron: KnownNeuron }
  | { phase: DialogPhase.Processing; neuron: KnownNeuron }
  | { phase: DialogPhase.Success; neuronName: string }
  | { phase: DialogPhase.Error; neuron: KnownNeuron };

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

  const [dialogState, setDialogState] = useState<DialogState>({ phase: DialogPhase.Closed });

  const fireFollowMutation = (knownNeuron: KnownNeuron) => {
    if (updateFollowingMutation.isPending) return;
    if (!neuronsQuery.data?.certified || !canister) return;
    const neurons = neuronsQuery.data.response;

    setDialogState({ phase: DialogPhase.Processing, neuron: knownNeuron });

    updateFollowingMutation.mutate({ neurons, knownNeuron });
  };

  const updateFollowingMutation = useMutation<
    void[],
    Error,
    { neurons: { neuronId: NeuronId }[]; knownNeuron: KnownNeuron },
    { previousSelectedId: string | null }
  >({
    mutationFn: ({ neurons, knownNeuron }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      const knownNeuronId = knownNeuron.id;
      const topicFollowing = buildKnownNeuronTopicFollowing(knownNeuronId);
      const promises = neurons.map((n) =>
        canister.setFollowing({
          neuronId: n.neuronId,
          topicFollowing,
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

      setDialogState({ phase: DialogPhase.Success, neuronName: variables.knownNeuron.name });
    },
    onError: (error, variables, context) => {
      console.error('Failed to update neuron:', error, (error as { detail?: unknown }).detail);
      setUserOverrideId(context?.previousSelectedId ?? null);
      setDialogState({ phase: DialogPhase.Error, neuron: variables.knownNeuron });
    },
  });

  const handleSelect = (knownNeuron: KnownNeuron) => {
    if (selectedNeuronId === knownNeuron.id.toString()) return;
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
        setDialogState({ phase: DialogPhase.Confirm, neuron: knownNeuron });
        return;
      }
    }

    fireFollowMutation(knownNeuron);
  };

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
                    updateFollowingMutation.isPending && selectedNeuronId === neuron.id.toString()
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

      <FollowNeuronDialog
        state={dialogState}
        onFollow={() => 'neuron' in dialogState && fireFollowMutation(dialogState.neuron)}
        onClose={() => setDialogState({ phase: DialogPhase.Closed })}
      />
    </>
  );
}

function FollowNeuronDialog({
  state,
  onFollow,
  onClose,
}: {
  state: DialogState;
  onFollow: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isOpen = state.phase !== DialogPhase.Closed;
  const isBlocking = state.phase === DialogPhase.Processing;

  useEffect(() => {
    if (state.phase !== DialogPhase.Success) return;
    const timer = setTimeout(onClose, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [state.phase, onClose]);

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => !open && !isBlocking && onClose()}
      dismissible={!isBlocking}
    >
      <ResponsiveDialogContent
        showCloseButton={!isBlocking}
        className="md:min-h-[200px] md:max-w-md"
      >
        <AnimatePresence mode="wait" initial={false}>
          {state.phase === DialogPhase.Confirm && (
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
                <Button variant="ghost" onClick={onClose}>
                  {t(($) => $.common.cancel)}
                </Button>
                <Button onClick={onFollow}>{t(($) => $.common.confirm)}</Button>
              </ResponsiveDialogFooter>
            </motion.div>
          )}

          {state.phase === DialogPhase.Processing && (
            <motion.div
              key="processing"
              className="flex h-full flex-col items-center justify-center gap-5 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.knownNeurons.api.processing, { name: state.neuron.name })}
              </ResponsiveDialogTitle>
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
                {t(($) => $.knownNeurons.api.processing, { name: state.neuron.name })}
              </motion.p>
            </motion.div>
          )}

          {state.phase === DialogPhase.Success && (
            <motion.div
              key="success"
              className="flex h-full flex-col items-center justify-center gap-5 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.knownNeurons.api.success, { name: state.neuronName })}
              </ResponsiveDialogTitle>
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
                {t(($) => $.knownNeurons.api.success, { name: state.neuronName })}
              </motion.p>
            </motion.div>
          )}

          {state.phase === DialogPhase.Error && (
            <motion.div
              key="error"
              className="flex h-full flex-col items-center justify-between text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.knownNeurons.api.error, { name: state.neuron.name })}
              </ResponsiveDialogTitle>
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
                  {t(($) => $.knownNeurons.api.error, { name: state.neuron.name })}
                </motion.p>
              </div>
              <div className="flex w-full gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  {t(($) => $.common.close)}
                </Button>
                <Button className="flex-1" onClick={onFollow}>
                  {t(($) => $.knownNeurons.api.retry)}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
