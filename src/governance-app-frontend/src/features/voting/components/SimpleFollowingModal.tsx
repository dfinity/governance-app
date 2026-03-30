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
  MutationDialog,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { Skeleton } from '@components/Skeleton';
import { DIALOG_RESET_DELAY_MS } from '@constants/extra';
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

  const [pendingNeuron, setPendingNeuron] = useState<KnownNeuron | null>(null);
  const [activeNeuronName, setActiveNeuronName] = useState('');

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
      analytics.event(AnalyticsEvent.FollowingSimpleConfirmation, {
        neuron_name: variables.knownNeuron.name,
      });
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
    onError: (error, _variables, context) => {
      errorMessage('SimpleFollowingModal', error.message);
      analytics.event(AnalyticsEvent.FollowingSimpleConfirmationError);
      setUserOverrideId(context?.previousSelectedId ?? null);
    },
  });

  const handleFollow = (
    knownNeuron: KnownNeuron,
    execute: (fn: () => Promise<unknown>) => void,
  ) => {
    if (updateFollowingMutation.isPending || isWaitingForCertifiedData || !canister) return;
    setActiveNeuronName(knownNeuron.name);
    execute(() => updateFollowingMutation.mutateAsync({ neurons: userNeurons!, knownNeuron }));
  };

  const handleSelect = (
    knownNeuron: KnownNeuron,
    execute: (fn: () => Promise<unknown>) => void,
  ) => {
    if (selectedNeuronId === knownNeuron.id.toString()) return;
    if (isWaitingForCertifiedData || !canister) return;

    if (userNeurons!.length === 0) {
      warningNotification({ description: t(($) => $.voting.warnings.stakeRequired) });
      return;
    }

    if (knownNeurons) {
      const currentFollowed = getUsersFollowedNeurons({
        userNeurons: userNeurons!,
        knownNeurons: knownNeurons!,
      });

      if (currentFollowed.length > 0) {
        setPendingNeuron(knownNeuron);
        return;
      }
    }

    handleFollow(knownNeuron, execute);
  };

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setPendingNeuron(null);
      setUserOverrideId(undefined);
      setSearchQuery('');
      setActiveNeuronName('');
      updateFollowingMutation.reset();
    }, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, updateFollowingMutation]);

  return (
    <MutationDialog
      open={open}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.knownNeurons.api.processing, { name: activeNeuronName })}
      successMessage={t(($) => $.knownNeurons.api.success, { name: activeNeuronName })}
      navBlockerDescription={t(($) => $.knownNeurons.api.processing, { name: activeNeuronName })}
    >
      {({ execute }) => (
        <AnimatePresence mode="wait" initial={false}>
          {pendingNeuron ? (
            <motion.div
              key="confirm"
              className="flex flex-1 flex-col justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MutationDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => $.knownNeurons.confirmation.title)}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.knownNeurons.confirmation.description)}
                </ResponsiveDialogDescription>
              </MutationDialogHeader>
              <MutationDialogFooter className="md:justify-end">
                <Button variant="ghost" onClick={() => setPendingNeuron(null)}>
                  {t(($) => $.common.cancel)}
                </Button>
                <Button onClick={() => handleFollow(pendingNeuron, execute)}>
                  {t(($) => $.common.confirm)}
                </Button>
              </MutationDialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="flex flex-1 flex-col gap-4 overflow-hidden pb-4 md:pb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MutationDialogHeader>
                <ResponsiveDialogTitle>{t(($) => $.knownNeurons.title)}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.knownNeurons.description)}
                </ResponsiveDialogDescription>
              </MutationDialogHeader>

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
                          onSelect={(n) => handleSelect(n, execute)}
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
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MutationDialog>
  );
}
