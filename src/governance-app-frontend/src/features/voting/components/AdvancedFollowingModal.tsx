import { type NeuronInfo, Topic } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Button } from '@components/button';
import { MutationDialog, MutationDialogFooter } from '@components/MutationDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { errorMessage } from '@utils/error';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { cn } from '@utils/shadcn';

import { buildAdvancedTopicFollowing, getConsistentTopicFollowees } from '../utils/topicFollowing';
import { FolloweePicker } from './FolloweePicker';
import { TopicFollowingAccordion } from './TopicFollowingAccordion';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdvancedFollowingModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();

  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    topic: Topic;
    followeeId: bigint;
    name: string;
  } | null>(null);

  const neuronsQuery = useGovernanceNeurons();
  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const isLoading = neuronsQuery.isLoading || knownNeuronsQuery.isLoading;
  const isWaitingForCertifiedData =
    !neuronsQuery.data?.certified || !knownNeuronsQuery.data?.certified;

  const consistentFollowees = getConsistentTopicFollowees(userNeurons);
  const isInconsistent = consistentFollowees === null;
  const followeesMap = isInconsistent ? new Map<Topic, bigint[]>() : consistentFollowees;
  const hasAnyFollowees = Array.from(followeesMap.values()).some((ids) => ids.length > 0);

  const handleRemove = (topic: Topic, followeeId: bigint) => {
    const known = knownNeurons.find((kn) => kn.id === followeeId);
    setRemoveTarget({ topic, followeeId, name: known?.name ?? followeeId.toString() });
    setRemoveDialogOpen(true);
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.voting.manageFollowing.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.voting.manageFollowing.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {isLoading ? (
            <div className="flex flex-col gap-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className={cn('mt-2 mb-4', isWaitingForCertifiedData && 'animate-pulse')}>
                <Button
                  size="xl"
                  className="w-full"
                  disabled={isWaitingForCertifiedData}
                  onClick={() => {
                    analytics.event(AnalyticsEvent.FollowingPickerSelectNeurons);
                    setPickerOpen(true);
                  }}
                  data-testid="set-followees-btn"
                >
                  {isWaitingForCertifiedData ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {isWaitingForCertifiedData
                    ? t(($) => $.voting.manageFollowing.certifying)
                    : t(($) => $.voting.manageFollowing.setFollowees)}
                </Button>
              </div>

              <div
                className={cn(
                  'flex-1 overflow-y-auto rounded-lg border',
                  isWaitingForCertifiedData && 'animate-pulse',
                )}
              >
                <TopicFollowingAccordion
                  followeesMap={followeesMap}
                  knownNeurons={knownNeurons}
                  mode="editable"
                  isInconsistent={isInconsistent}
                  isDisabled={isWaitingForCertifiedData}
                  onRemove={handleRemove}
                />
              </div>

              {(hasAnyFollowees || isInconsistent) && (
                <div className="pt-2 pb-4 md:pb-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    disabled={isWaitingForCertifiedData}
                    onClick={() => setClearAllDialogOpen(true)}
                    data-testid="clear-all-following-btn"
                  >
                    {t(($) => $.voting.manageFollowing.clearAllFollowing)}
                  </Button>
                </div>
              )}
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <FolloweePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        userNeurons={userNeurons}
        currentFolloweesMap={followeesMap}
        isOverride={isInconsistent}
      />

      <RemoveFolloweeDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        target={removeTarget}
        userNeurons={userNeurons}
        followeesMap={followeesMap}
      />

      <ClearAllFollowingDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        userNeurons={userNeurons}
      />
    </>
  );
}

function RemoveFolloweeDialog({
  open,
  onOpenChange,
  target,
  userNeurons,
  followeesMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { topic: Topic; followeeId: bigint; name: string } | null;
  userNeurons: NeuronInfo[];
  followeesMap: Map<Topic, bigint[]>;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsGovernance();

  const mutation = useMutation<void[], Error>({
    mutationFn: () => {
      if (!canister || !target) throw new Error(t(($) => $.common.unknownError));
      const updated = new Map(followeesMap);
      const current = updated.get(target.topic) ?? [];
      updated.set(
        target.topic,
        current.filter((id) => id !== target.followeeId),
      );
      const topicFollowing = buildAdvancedTopicFollowing(updated);
      return Promise.all(
        userNeurons.map((n) => canister.setFollowing({ neuronId: n.neuronId, topicFollowing })),
      );
    },
    onSuccess: async () => {
      analytics.event(AnalyticsEvent.FollowingRemoveFollowee);
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
    onError: (error) => {
      errorMessage('RemoveFolloweeDialog', error.message);
    },
  });

  return (
    <MutationDialog
      open={open}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.voting.manageFollowing.removingFollowee)}
      successMessage={t(($) => $.voting.manageFollowing.removeSuccess)}
      navBlockerDescription={t(($) => $.voting.manageFollowing.removingFollowee)}
      data-testid="remove-followee-dialog"
    >
      {({ execute, close }) => (
        <>
          <ResponsiveDialogTitle className="sr-only">
            {t(($) => $.voting.manageFollowing.remove)}
          </ResponsiveDialogTitle>
          <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 md:mt-0">
            <div className="flex size-14 items-center justify-center rounded-full bg-orange-500/10">
              <AlertTriangle className="size-8 text-orange-500 dark:text-orange-400" />
            </div>
            <p className="px-2 text-center text-sm text-muted-foreground">
              {t(($) => $.voting.manageFollowing.removeConfirm, { name: target?.name ?? '' })}
            </p>
          </div>
          <MutationDialogFooter>
            <Button variant="outline" size="xl" className="md:flex-1" onClick={close}>
              {t(($) => $.common.cancel)}
            </Button>
            <Button
              size="xl"
              className="md:flex-1"
              onClick={() => execute(() => mutation.mutateAsync())}
              data-testid="remove-followee-confirm-btn"
            >
              {t(($) => $.voting.manageFollowing.remove)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}

function ClearAllFollowingDialog({
  open,
  onOpenChange,
  userNeurons,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userNeurons: NeuronInfo[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsGovernance();

  const mutation = useMutation<void[], Error>({
    mutationFn: () => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));
      const topicFollowing = buildAdvancedTopicFollowing(new Map());
      return Promise.all(
        userNeurons.map((n) => canister.setFollowing({ neuronId: n.neuronId, topicFollowing })),
      );
    },
    onSuccess: async () => {
      analytics.event(AnalyticsEvent.FollowingClearAll);
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
    onError: (error) => {
      errorMessage('ClearAllFollowingDialog', error.message);
    },
  });

  return (
    <MutationDialog
      open={open}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.voting.manageFollowing.clearAllProcessing)}
      successMessage={t(($) => $.voting.manageFollowing.clearAllSuccess)}
      navBlockerDescription={t(($) => $.voting.manageFollowing.clearAllProcessing)}
      data-testid="clear-all-dialog"
    >
      {({ execute, close }) => (
        <>
          <ResponsiveDialogTitle className="sr-only">
            {t(($) => $.voting.manageFollowing.clearAllFollowing)}
          </ResponsiveDialogTitle>
          <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 md:mt-0">
            <div className="flex size-14 items-center justify-center rounded-full bg-orange-500/10">
              <AlertTriangle className="size-8 text-orange-500 dark:text-orange-400" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold">
                {t(($) => $.voting.manageFollowing.clearAllFollowing)}
              </p>
              <p className="px-2 text-center text-sm text-muted-foreground">
                {t(($) => $.voting.manageFollowing.clearAllConfirm)}
              </p>
            </div>
          </div>
          <MutationDialogFooter>
            <Button variant="outline" size="xl" className="md:flex-1" onClick={close}>
              {t(($) => $.common.cancel)}
            </Button>
            <Button
              variant="destructive"
              size="xl"
              className="md:flex-1"
              onClick={() => execute(() => mutation.mutateAsync())}
              data-testid="clear-all-confirm-btn"
            >
              {t(($) => $.voting.manageFollowing.clearAllAction)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
