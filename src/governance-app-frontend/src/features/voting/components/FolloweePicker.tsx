import { type KnownNeuron, type NeuronInfo, Topic } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckSquare2,
  ChevronDown,
  ChevronUp,
  Info,
  Minus,
  Plus,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Alert, AlertDescription } from '@components/Alert';
import { AnimatedCollapse } from '@components/AnimatedCollapse';
import { Badge } from '@components/badge';
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
import { stringToBigInt } from '@utils/bigInt';
import { errorMessage } from '@utils/error';
import { shortenNeuronId } from '@utils/neuron';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { cn } from '@utils/shadcn';

import { INDIVIDUAL_TOPICS, TOP_LEVEL_TOPICS } from '../data/topics';
import { isActiveKnownNeuron, sortKnownNeurons } from '../utils/knownNeurons';
import { buildAdvancedTopicFollowing } from '../utils/topicFollowing';
import { KnownNeuronCard } from './KnownNeuronCard';

enum WizardStep {
  SelectNeurons = 'selectNeurons',
  SelectTopics = 'selectTopics',
  Confirm = 'confirm',
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userNeurons: NeuronInfo[];
  currentFolloweesMap: Map<Topic, bigint[]>;
  isOverride?: boolean;
};

export function FolloweePicker({
  open,
  onOpenChange,
  userNeurons,
  currentFolloweesMap,
  isOverride = false,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsGovernance();
  const neuronsQuery = useGovernanceNeurons();

  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const sortedKnownNeurons = knownNeurons.filter(isActiveKnownNeuron).toSorted(sortKnownNeurons);

  const [step, setStep] = useState<WizardStep>(WizardStep.SelectNeurons);
  const [selectedNeuronIds, setSelectedNeuronIds] = useState<Set<bigint>>(new Set());
  const [customNeuronIds, setCustomNeuronIds] = useState<Set<bigint>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<Topic>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customIdInput, setCustomIdInput] = useState('');
  const [customIdError, setCustomIdError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep(WizardStep.SelectNeurons);
        setSelectedNeuronIds(new Set());
        setCustomNeuronIds(new Set());
        setSelectedTopics(new Set());
        setSearchQuery('');
        setCustomIdInput('');
        setCustomIdError(null);
      }, DIALOG_RESET_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const filteredNeurons = useMemo(() => {
    if (!searchQuery.trim()) return sortedKnownNeurons;
    const query = searchQuery.toLowerCase();
    return sortedKnownNeurons.filter((n) => n.name.toLowerCase().includes(query));
  }, [sortedKnownNeurons, searchQuery]);

  const toggleNeuron = (id: bigint) => {
    setSelectedNeuronIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomNeuron = () => {
    setCustomIdError(null);
    const trimmed = customIdInput.trim();
    if (!trimmed) return;

    const id = stringToBigInt(trimmed);
    if (id === undefined) {
      setCustomIdError(t(($) => $.voting.picker.invalidNeuronId));
      return;
    }

    if (selectedNeuronIds.has(id)) {
      setCustomIdError(t(($) => $.voting.picker.duplicateNeuronId));
      return;
    }

    setSelectedNeuronIds((prev) => new Set(prev).add(id));
    setCustomNeuronIds((prev) => new Set(prev).add(id));
    setCustomIdInput('');
  };

  const removeCustomNeuron = (id: bigint) => {
    setSelectedNeuronIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setCustomNeuronIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const individualTopicIds = INDIVIDUAL_TOPICS.map((t) => t.topic);

  const toggleTopic = (topic: Topic) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const allIndividualSelected = individualTopicIds.every((t) => selectedTopics.has(t));
  const toggleAllIndividual = () => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (allIndividualSelected) {
        for (const id of individualTopicIds) next.delete(id);
      } else {
        for (const id of individualTopicIds) next.add(id);
      }
      return next;
    });
  };

  const applyMutation = useMutation<void[], Error>({
    mutationFn: () => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      const updated = new Map(currentFolloweesMap);
      const selectedIds = Array.from(selectedNeuronIds);

      for (const topic of selectedTopics) {
        const existing = updated.get(topic) ?? [];
        updated.set(topic, Array.from(new Set([...existing, ...selectedIds])));
      }

      const topicFollowing = buildAdvancedTopicFollowing(updated);
      return Promise.all(
        userNeurons.map((n) => canister.setFollowing({ neuronId: n.neuronId, topicFollowing })),
      );
    },
    onSuccess: async () => {
      analytics.event(AnalyticsEvent.FollowingPickerApply, {
        topic_count: selectedTopics.size.toString(),
      });
      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    },
    onError: (error) => {
      errorMessage('FolloweePicker', error.message);
      analytics.event(AnalyticsEvent.FollowingPickerApplyError);
    },
  });

  const selectedCount = selectedNeuronIds.size;
  const topicCount = selectedTopics.size;

  return (
    <MutationDialog
      open={open}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.voting.picker.processing)}
      successMessage={t(($) => $.voting.picker.success, { count: selectedTopics.size })}
      navBlockerDescription={t(($) => $.voting.picker.processing)}
      data-testid="followee-picker-dialog"
    >
      {({ execute }) =>
        step === WizardStep.Confirm ? (
          <ConfirmStep
            onConfirm={() => {
              if (!neuronsQuery.data?.certified || !canister) return;
              execute(() => applyMutation.mutateAsync());
            }}
            onCancel={() => setStep(WizardStep.SelectTopics)}
            isOverride={isOverride}
          />
        ) : (
          <>
            <div
              className={cn(
                'flex flex-1 flex-col overflow-hidden',
                step !== WizardStep.SelectNeurons && 'hidden',
              )}
            >
              <StepSelectNeurons
                knownNeurons={filteredNeurons}
                customNeuronIds={customNeuronIds}
                selectedNeuronIds={selectedNeuronIds}
                isLoading={knownNeuronsQuery.isLoading}
                searchQuery={searchQuery}
                customIdInput={customIdInput}
                customIdError={customIdError}
                onSearchChange={setSearchQuery}
                onCustomIdChange={(v) => {
                  setCustomIdInput(v);
                  setCustomIdError(null);
                }}
                onAddCustom={addCustomNeuron}
                onRemoveCustom={removeCustomNeuron}
                onToggle={toggleNeuron}
                onNext={() => {
                  analytics.event(AnalyticsEvent.FollowingPickerSelectTopics, {
                    count: selectedCount.toString(),
                  });
                  setStep(WizardStep.SelectTopics);
                }}
                selectedCount={selectedCount}
              />
            </div>

            <div
              className={cn(
                'flex flex-1 flex-col overflow-hidden',
                step !== WizardStep.SelectTopics && 'hidden',
              )}
            >
              <StepSelectTopics
                selectedNeuronIds={selectedNeuronIds}
                knownNeurons={sortedKnownNeurons}
                customNeuronIds={customNeuronIds}
                selectedTopics={selectedTopics}
                allIndividualSelected={allIndividualSelected}
                onToggleTopic={toggleTopic}
                onToggleAllIndividual={toggleAllIndividual}
                onBack={() => setStep(WizardStep.SelectNeurons)}
                onApply={() => setStep(WizardStep.Confirm)}
                topicCount={topicCount}
              />
            </div>
          </>
        )
      }
    </MutationDialog>
  );
}

function StepSelectNeurons({
  knownNeurons,
  customNeuronIds,
  selectedNeuronIds,
  isLoading,
  searchQuery,
  customIdInput,
  customIdError,
  onSearchChange,
  onCustomIdChange,
  onAddCustom,
  onRemoveCustom,
  onToggle,
  onNext,
  selectedCount,
}: {
  knownNeurons: KnownNeuron[];
  customNeuronIds: Set<bigint>;
  selectedNeuronIds: Set<bigint>;
  isLoading: boolean;
  searchQuery: string;
  customIdInput: string;
  customIdError: string | null;
  onSearchChange: (q: string) => void;
  onCustomIdChange: (v: string) => void;
  onAddCustom: () => void;
  onRemoveCustom: (id: bigint) => void;
  onToggle: (id: bigint) => void;
  onNext: () => void;
  selectedCount: number;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const prevCustomCount = useRef(customNeuronIds.size);
  useEffect(() => {
    if (customNeuronIds.size > prevCustomCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCustomCount.current = customNeuronIds.size;
  }, [customNeuronIds.size]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <MutationDialogHeader>
        <ResponsiveDialogTitle>{t(($) => $.voting.picker.selectNeurons)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {t(($) => $.voting.picker.selectNeuronsDesc)}
        </ResponsiveDialogDescription>
      </MutationDialogHeader>

      <Input
        placeholder={t(($) => $.voting.picker.searchPlaceholder)}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="shrink-0 focus-visible:ring-0"
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border">
        <div className="flex flex-col divide-y">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="size-6 rounded" />
                  <Skeleton className="h-5 w-48" />
                </div>
              ))}
            </div>
          ) : knownNeurons.length === 0 && customNeuronIds.size === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t(($) => $.voting.picker.noResults)}
            </p>
          ) : (
            <>
              {knownNeurons.map((neuron) => (
                <div key={neuron.id.toString()}>
                  <KnownNeuronCard
                    neuron={neuron}
                    isSelected={selectedNeuronIds.has(neuron.id)}
                    onSelect={() => onToggle(neuron.id)}
                    isDisabled={false}
                    mode="checkbox"
                  />
                </div>
              ))}

              {Array.from(customNeuronIds).map((id) => (
                <CustomNeuronRow
                  key={id.toString()}
                  id={id}
                  isSelected={selectedNeuronIds.has(id)}
                  onToggle={() => onToggle(id)}
                  onRemove={() => onRemoveCustom(id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t(($) => $.voting.picker.addCustomPlaceholder)}
          value={customIdInput}
          onChange={(e) => onCustomIdChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddCustom()}
          className={cn('focus-visible:ring-0', customIdError && 'border-destructive')}
          data-testid="picker-custom-id-input"
        />
        <Button
          variant="outline"
          onClick={onAddCustom}
          className="h-9 shrink-0 px-3"
          data-testid="picker-custom-id-add"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {customIdError && (
        <Alert variant="warning">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertDescription>{customIdError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-auto pt-2 pb-4 md:pb-0">
        <Button
          size="xl"
          className="w-full"
          disabled={selectedCount === 0}
          onClick={onNext}
          data-testid="picker-next-btn"
        >
          {t(($) => $.voting.picker.next, { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}

function StepSelectTopics({
  selectedNeuronIds,
  knownNeurons,
  customNeuronIds,
  selectedTopics,
  allIndividualSelected,
  onToggleTopic,
  onToggleAllIndividual,
  onBack,
  onApply,
  topicCount,
}: {
  selectedNeuronIds: Set<bigint>;
  knownNeurons: KnownNeuron[];
  customNeuronIds: Set<bigint>;
  selectedTopics: Set<Topic>;
  allIndividualSelected: boolean;
  onToggleTopic: (topic: Topic) => void;
  onToggleAllIndividual: () => void;
  onBack: () => void;
  onApply: () => void;
  topicCount: number;
}) {
  const { t } = useTranslation();

  const neuronPills = Array.from(selectedNeuronIds).map((id) => {
    const known = knownNeurons.find((kn) => kn.id === id);
    return {
      id,
      label: known?.name ?? shortenNeuronId(id),
      isCustom: customNeuronIds.has(id),
    };
  });

  const [individualExpanded, setIndividualExpanded] = useState(false);
  const individualSelectedCount = INDIVIDUAL_TOPICS.filter((t) =>
    selectedTopics.has(t.topic),
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <MutationDialogHeader>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-md p-1 hover:bg-muted">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <ResponsiveDialogTitle>{t(($) => $.voting.picker.selectTopics)}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.voting.picker.selectTopicsDesc)}
            </ResponsiveDialogDescription>
          </div>
        </div>
      </MutationDialogHeader>

      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {t(($) => $.voting.picker.next, { count: neuronPills.length })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {neuronPills.map((pill) => (
            <Badge
              key={pill.id.toString()}
              variant="secondary"
              className="gap-1.5 px-2.5 py-1 text-xs"
            >
              {pill.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border">
        <div className="flex flex-col divide-y">
          {TOP_LEVEL_TOPICS.map((cat) => (
            <TopicCheckbox
              key={cat.topic}
              label={t(cat.labelKey as never)}
              checked={selectedTopics.has(cat.topic)}
              onChange={() => onToggleTopic(cat.topic)}
              data-testid={`picker-topic-${cat.topic}`}
            />
          ))}
        </div>

        <div className="border-t">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
            onClick={() => setIndividualExpanded((v) => !v)}
            data-testid="picker-individual-topics-toggle"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t(($) => $.voting.picker.individualTopics)}
              </span>
              {individualSelectedCount > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {individualSelectedCount}/{INDIVIDUAL_TOPICS.length}
                </span>
              )}
            </div>
            {individualExpanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>

          <AnimatedCollapse open={individualExpanded}>
            <Alert variant="info" className="rounded-none border-x-0">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span className="text-xs">{t(($) => $.voting.picker.individualTopicsHint)}</span>
                <button
                  className="shrink-0 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
                  onClick={onToggleAllIndividual}
                >
                  {allIndividualSelected
                    ? t(($) => $.voting.picker.deselectAll)
                    : t(($) => $.voting.picker.selectAll)}
                </button>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col divide-y">
              {INDIVIDUAL_TOPICS.map((indTopic) => (
                <TopicCheckbox
                  key={indTopic.topic}
                  label={t(indTopic.labelKey as never)}
                  checked={selectedTopics.has(indTopic.topic)}
                  onChange={() => onToggleTopic(indTopic.topic)}
                  data-testid={`picker-topic-${indTopic.topic}`}
                />
              ))}
            </div>
          </AnimatedCollapse>
        </div>
      </div>

      <div className="mt-auto pt-2 pb-4 md:pb-0">
        <Button
          size="xl"
          className="w-full"
          disabled={topicCount === 0}
          onClick={onApply}
          data-testid="picker-apply-btn"
        >
          {t(($) => $.voting.picker.applyToTopics, { count: topicCount })}
        </Button>
      </div>
    </div>
  );
}

function CustomNeuronRow({
  id,
  isSelected,
  onToggle,
  onRemove,
}: {
  id: bigint;
  isSelected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer transition-colors hover:bg-muted/50"
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle()}
    >
      <div className="flex h-14 shrink-0 items-center pl-5">
        {isSelected ? (
          <CheckSquare2 className="size-6 text-primary" />
        ) : (
          <Square className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 grow flex-col">
        <div className="flex h-14 items-center justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-1 pl-4">
            <span className="truncate text-sm leading-none">{id.toString()}</span>
          </div>
          <Button
            variant="ghost"
            className="h-full min-w-20 shrink-0 rounded-none hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TopicCheckbox({
  label,
  checked,
  indeterminate,
  onChange,
  className,
  'data-testid': dataTestId,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      className={cn('flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50', className)}
      onClick={onChange}
      data-testid={dataTestId}
    >
      {indeterminate ? (
        <div className="relative flex size-6 items-center justify-center">
          <Square className="size-6 text-primary" />
          <Minus className="absolute size-3.5 text-primary" />
        </div>
      ) : checked ? (
        <CheckSquare2 className="size-6 text-primary" />
      ) : (
        <Square className="size-6 text-muted-foreground" />
      )}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function ConfirmStep({
  onConfirm,
  onCancel,
  isOverride,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isOverride: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <ResponsiveDialogTitle className="sr-only">
        {t(($) => $.voting.picker.confirm.title)}
      </ResponsiveDialogTitle>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-full',
            isOverride ? 'bg-orange-500/10' : 'bg-blue-100 dark:bg-blue-900/30',
          )}
        >
          {isOverride ? (
            <AlertTriangle className="size-8 text-orange-500 dark:text-orange-400" />
          ) : (
            <Info className="size-8 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold">{t(($) => $.voting.picker.confirm.title)}</p>
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            {isOverride
              ? t(($) => $.voting.picker.confirm.overrideDescription)
              : t(($) => $.voting.picker.confirm.description)}
          </p>
        </div>
      </div>
      <MutationDialogFooter>
        <Button variant="outline" size="xl" className="md:flex-1" onClick={onCancel}>
          {t(($) => $.common.cancel)}
        </Button>
        <Button
          size="xl"
          className="md:flex-1"
          onClick={onConfirm}
          data-testid="picker-confirm-btn"
        >
          {t(($) => $.common.confirm)}
        </Button>
      </MutationDialogFooter>
    </>
  );
}
