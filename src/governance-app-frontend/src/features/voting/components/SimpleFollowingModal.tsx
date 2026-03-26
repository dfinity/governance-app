import { type KnownNeuron, type NeuronId } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import {
  AnimatedErrorIcon,
  AnimatedSpinner,
  AnimatedSuccessIcon,
  FadeInText,
  PhaseContainer,
} from '@components/MutationPhases';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { Skeleton } from '@components/Skeleton';
import { DIALOG_RESET_DELAY_MS, SUCCESS_AUTO_CLOSE_MS } from '@constants/extra';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { errorMessage } from '@utils/error';
import { warningNotification } from '@utils/notification';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { cn } from '@utils/shadcn';

import { getUsersFollowedNeurons, isKnownNeuron } from '../utils/findFollowedNeuron';
import {
  buildKnownNeuronTopicFollowing,
  isActiveKnownNeuron,
  sortKnownNeurons,
} from '../utils/knownNeurons';
import { hasComplexFollowing } from '../utils/topicFollowing';
import { KnownNeuronCard } from './KnownNeuronCard';

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

const hasNeuron = (
  state: DialogState,
): state is {
  phase: DialogPhase.Confirm | DialogPhase.Processing | DialogPhase.Error;
  neuron: KnownNeuron;
} =>
  state.phase === DialogPhase.Confirm ||
  state.phase === DialogPhase.Processing ||
  state.phase === DialogPhase.Error;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SimpleFollowingModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsGovernance();

  const neuronsQuery = useGovernanceNeurons();
  const userNeurons = neuronsQuery.data?.response;

  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const knownNeurons = knownNeuronsQuery.data?.response;
  const sortedKnownNeurons = knownNeurons?.filter(isActiveKnownNeuron).toSorted(sortKnownNeurons);

  const isWaitingForCertifiedData =
    !neuronsQuery.data?.certified || !knownNeuronsQuery.data?.certified;

  const isComplex = userNeurons ? hasComplexFollowing(userNeurons) : false;
  const followedNeurons =
    !isComplex && userNeurons && knownNeurons
      ? getUsersFollowedNeurons({ userNeurons, knownNeurons })
      : [];
  const derivedSelectedId =
    followedNeurons.length === 1 && isKnownNeuron(followedNeurons[0])
      ? followedNeurons[0].id.toString()
      : null;
  const [userOverrideId, setUserOverrideId] = useState<string | null | undefined>(undefined);
  const selectedNeuronId = userOverrideId ?? derivedSelectedId;

  const [searchQuery, setSearchQuery] = useState('');
  const filteredNeurons = useMemo(() => {
    if (!searchQuery.trim()) return sortedKnownNeurons;
    const query = searchQuery.toLowerCase();
    return sortedKnownNeurons?.filter((n) => n.name.toLowerCase().includes(query));
  }, [sortedKnownNeurons, searchQuery]);

  const [dialogState, setDialogState] = useState<DialogState>({ phase: DialogPhase.Closed });
  const isBlocking = dialogState.phase === DialogPhase.Processing;
  const isInConfirmFlow = dialogState.phase !== DialogPhase.Closed;

  const handleFollow = (knownNeuron: KnownNeuron) => {
    if (updateFollowingMutation.isPending || isWaitingForCertifiedData || !canister) return;
    setDialogState({ phase: DialogPhase.Processing, neuron: knownNeuron });
    updateFollowingMutation.mutate({ neurons: userNeurons!, knownNeuron });
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
      setUserOverrideId(variables.knownNeuron.id.toString());
      return { previousSelectedId: selectedNeuronId };
    },
    onSuccess: async (_, variables) => {
      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        })
        .catch(failedRefresh);

      analytics.event(AnalyticsEvent.FollowingSimpleConfirmation, {
        neuron_name: variables.knownNeuron.name,
      });
      setDialogState({ phase: DialogPhase.Success, neuronName: variables.knownNeuron.name });
    },
    onError: (error, variables, context) => {
      errorMessage('SimpleFollowingModal', error.message);
      analytics.event(AnalyticsEvent.FollowingSimpleConfirmationError);
      setUserOverrideId(context?.previousSelectedId ?? null);
      setDialogState({ phase: DialogPhase.Error, neuron: variables.knownNeuron });
    },
  });

  const handleSelect = (knownNeuron: KnownNeuron) => {
    if (selectedNeuronId === knownNeuron.id.toString()) return;
    if (isWaitingForCertifiedData || !canister) return;

    if (userNeurons!.length === 0) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }

    if (knownNeurons) {
      const currentFollowed = getUsersFollowedNeurons({
        userNeurons: userNeurons!,
        knownNeurons: knownNeurons!,
      });

      if (currentFollowed.length > 0) {
        setDialogState({ phase: DialogPhase.Confirm, neuron: knownNeuron });
        return;
      }
    }

    handleFollow(knownNeuron);
  };

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setDialogState({ phase: DialogPhase.Closed });
        setUserOverrideId(undefined);
        setSearchQuery('');
        updateFollowingMutation.reset();
        // Timeout to ensure the dialog is fully closed before resetting the state
      }, DIALOG_RESET_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [open, updateFollowingMutation]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isBlocking) return;
    onOpenChange(nextOpen);
  };

  return (
    <>
      <NavigationBlockerDialog
        isBlocked={isBlocking}
        description={t(($) => $.knownNeurons.api.processing, {
          name: hasNeuron(dialogState) ? dialogState.neuron.name : '',
        })}
      />

      <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible={!isBlocking}>
        <ResponsiveDialogContent
          showCloseButton={!isBlocking}
          className="flex max-h-[90vh] flex-col"
        >
          {isInConfirmFlow ? (
            <ConfirmFlow
              state={dialogState}
              onFollow={() => hasNeuron(dialogState) && handleFollow(dialogState.neuron)}
              onClose={() => setDialogState({ phase: DialogPhase.Closed })}
              onDone={() => {
                setDialogState({ phase: DialogPhase.Closed });
                onOpenChange(false);
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-hidden pb-4 md:pb-0">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{t(($) => $.knownNeurons.title)}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.knownNeurons.description)}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              {isComplex && (
                <Alert variant="warning">
                  <AlertTitle className="font-semibold">
                    {t(($) => $.voting.warnings.followingMismatchTitle)}
                  </AlertTitle>
                  <AlertDescription>
                    {t(($) => $.voting.warnings.followingMismatch)}
                  </AlertDescription>
                </Alert>
              )}

              <Input
                placeholder={t(($) => $.voting.picker.searchPlaceholder)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="shrink-0 focus-visible:ring-0"
              />

              <div
                className={cn(
                  'flex-1 overflow-y-auto rounded-lg border',
                  isWaitingForCertifiedData && 'animate-pulse',
                )}
              >
                <div className="flex flex-col divide-y">
                  {knownNeuronsQuery.isLoading ? (
                    <div className="flex flex-col gap-3 p-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <Skeleton className="size-6 rounded" />
                          <Skeleton className="h-5 w-48" />
                        </div>
                      ))}
                    </div>
                  ) : knownNeuronsQuery.isError ? (
                    <p className="py-4 text-center text-destructive">
                      {t(($) => $.common.loadingError)}
                    </p>
                  ) : filteredNeurons?.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? t(($) => $.voting.picker.noResults)
                        : t(($) => $.knownNeurons.empty)}
                    </p>
                  ) : (
                    filteredNeurons?.map((neuron) => (
                      <div key={neuron.id.toString()}>
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
                            isWaitingForCertifiedData
                          }
                          mode="radio"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function ConfirmFlow({
  state,
  onFollow,
  onClose,
  onDone,
}: {
  state: DialogState;
  onFollow: () => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (state.phase !== DialogPhase.Success) return;
    const timer = setTimeout(onDone, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [state.phase, onDone]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.phase === DialogPhase.Confirm && (
        <motion.div
          key="confirm"
          className="flex flex-1 flex-col justify-between"
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
        <PhaseContainer key="processing" className="items-center justify-center gap-5">
          <ResponsiveDialogTitle className="sr-only">
            {t(($) => $.knownNeurons.api.processing, { name: state.neuron.name })}
          </ResponsiveDialogTitle>
          <AnimatedSpinner />
          <FadeInText delay={0.2}>
            {t(($) => $.knownNeurons.api.processing, { name: state.neuron.name })}
          </FadeInText>
        </PhaseContainer>
      )}

      {state.phase === DialogPhase.Success && (
        <PhaseContainer key="success" className="items-center justify-center gap-5">
          <ResponsiveDialogTitle className="sr-only">
            {t(($) => $.knownNeurons.api.success, { name: state.neuronName })}
          </ResponsiveDialogTitle>
          <AnimatedSuccessIcon />
          <FadeInText delay={0.35} className="max-w-xs">
            {t(($) => $.knownNeurons.api.success, { name: state.neuronName })}
          </FadeInText>
        </PhaseContainer>
      )}

      {state.phase === DialogPhase.Error && (
        <PhaseContainer key="error" className="items-center justify-between">
          <ResponsiveDialogTitle className="sr-only">
            {t(($) => $.knownNeurons.api.error, { name: state.neuron.name })}
          </ResponsiveDialogTitle>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <AnimatedErrorIcon />
            <FadeInText delay={0.3} className="max-w-xs">
              {t(($) => $.knownNeurons.api.error, { name: state.neuron.name })}
            </FadeInText>
          </div>
          <div className="flex w-full gap-3 pt-4">
            <Button variant="outline" size="xl" className="flex-1" onClick={onClose}>
              {t(($) => $.common.close)}
            </Button>
            <Button size="xl" className="flex-1" onClick={onFollow}>
              {t(($) => $.knownNeurons.api.retry)}
            </Button>
          </div>
        </PhaseContainer>
      )}
    </AnimatePresence>
  );
}
