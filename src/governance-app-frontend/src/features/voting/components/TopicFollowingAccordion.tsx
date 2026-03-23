import { type KnownNeuron, Topic } from '@icp-sdk/canisters/nns';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedCollapse } from '@components/AnimatedCollapse';
import { Badge } from '@components/badge';
import { shortenNeuronId } from '@utils/neuron';
import { cn } from '@utils/shadcn';

import { CATCH_ALL_TOPICS, INDIVIDUAL_TOPICS } from '../data/topics';
import {
  getConfiguredIndividualTopicCount,
  getEffectiveFollowees,
  isTopicConfigured,
  resolveFolloweeNames,
} from '../utils/topicFollowing';

type Mode = 'summary' | 'readonly' | 'editable';

type Props = {
  followeesMap: Map<Topic, bigint[]>;
  knownNeurons: KnownNeuron[];
  mode?: Mode;
  isInconsistent?: boolean;
  isDisabled?: boolean;
  onRemove?: (topic: Topic, followeeId: bigint) => void;
};

export function TopicFollowingAccordion({
  followeesMap,
  knownNeurons,
  mode = 'readonly',
  isInconsistent = false,
  isDisabled = false,
  onRemove,
}: Props) {
  return (
    <div className="flex flex-col divide-y">
      {CATCH_ALL_TOPICS.map((topicGroup) => (
        <TopicRow
          key={topicGroup.topic}
          topic={topicGroup.topic}
          labelKey={topicGroup.labelKey}
          followeesMap={followeesMap}
          knownNeurons={knownNeurons}
          mode={mode}
          isInconsistent={isInconsistent}
          isDisabled={isDisabled}
          onRemove={onRemove}
          showIndividualTopics={topicGroup.topic === Topic.Unspecified}
        />
      ))}
    </div>
  );
}

function TopicRow({
  topic,
  labelKey,
  followeesMap,
  knownNeurons,
  mode,
  isInconsistent,
  isDisabled,
  onRemove,
  showIndividualTopics,
}: {
  topic: Topic;
  labelKey: string;
  followeesMap: Map<Topic, bigint[]>;
  knownNeurons: KnownNeuron[];
  mode: Mode;
  isInconsistent: boolean;
  isDisabled: boolean;
  onRemove?: (topic: Topic, followeeId: bigint) => void;
  showIndividualTopics: boolean;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const { followees } = getEffectiveFollowees(topic, followeesMap);
  const count = followees.length;

  const individualConfiguredCount = showIndividualTopics
    ? getConfiguredIndividualTopicCount(followeesMap)
    : 0;
  const allIndividualConfigured =
    showIndividualTopics && individualConfiguredCount === INDIVIDUAL_TOPICS.length;
  const configured =
    isTopicConfigured(topic, followeesMap) || (showIndividualTopics && allIndividualConfigured);
  const hasAnyContent = count > 0 || (showIndividualTopics && individualConfiguredCount > 0);

  const isSummary = mode === 'summary';
  const isExpandable = !isSummary && hasAnyContent;

  const names = resolveFolloweeNames(followees, knownNeurons);

  const summaryText = isSummary
    ? names.length > 0
      ? names.join(', ')
      : showIndividualTopics && individualConfiguredCount > 0
        ? t(($) => $.voting.overview.individualCoverage, {
            count: individualConfiguredCount,
            total: INDIVIDUAL_TOPICS.length,
          })
        : t(($) => $.voting.overview.noFollowing)
    : isInconsistent
      ? t(($) => $.voting.manageFollowing.mixed)
      : count > 0
        ? t(($) => $.voting.manageFollowing.followeesCount, { count })
        : showIndividualTopics && individualConfiguredCount > 0
          ? t(($) => $.voting.overview.individualCoverage, {
              count: individualConfiguredCount,
              total: INDIVIDUAL_TOPICS.length,
            })
          : t(($) => $.voting.manageFollowing.noFollowees);

  return (
    <div className="flex flex-col" data-testid={`topic-row-${topic}`}>
      <button
        className={cn(
          'flex items-center justify-between gap-4 px-4 py-3 text-left',
          isExpandable && 'hover:bg-muted/50',
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        disabled={!isExpandable}
      >
        <div className="flex items-center gap-3">
          {configured ? (
            <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{t(labelKey as never)}</span>
            {isSummary && showIndividualTopics && names.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t(($) => $.voting.overview.individualCoverage, {
                  count: individualConfiguredCount,
                  total: INDIVIDUAL_TOPICS.length,
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={cn(
              'text-xs text-muted-foreground',
              isSummary && names.length > 0
                ? 'max-w-[200px] truncate text-right text-sm'
                : 'max-w-[140px] truncate',
            )}
          >
            {summaryText}
          </span>
          {isExpandable &&
            (isExpanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            ))}
        </div>
      </button>

      <AnimatedCollapse open={isExpanded && isExpandable}>
        <div className="border-t bg-muted/20 px-4 py-3">
          {count > 0 ? (
            <FolloweeBadges
              topic={topic}
              followees={followees}
              knownNeurons={knownNeurons}
              editable={mode === 'editable'}
              isDisabled={isDisabled}
              onRemove={onRemove}
            />
          ) : (
            showIndividualTopics && (
              <p className="text-xs text-muted-foreground">
                {t(($) => $.voting.manageFollowing.noCatchAll)}
              </p>
            )
          )}

          {showIndividualTopics && (
            <IndividualTopicsSection
              followeesMap={followeesMap}
              knownNeurons={knownNeurons}
              editable={mode === 'editable'}
              isDisabled={isDisabled}
              onRemove={onRemove}
            />
          )}
        </div>
      </AnimatedCollapse>
    </div>
  );
}

function FolloweeBadges({
  topic,
  followees,
  knownNeurons,
  editable,
  isDisabled,
  onRemove,
}: {
  topic: Topic;
  followees: bigint[];
  knownNeurons: KnownNeuron[];
  editable: boolean;
  isDisabled: boolean;
  onRemove?: (topic: Topic, followeeId: bigint) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      {followees.map((id) => {
        const known = knownNeurons.find((kn) => kn.id === id);
        const name = known?.name ?? shortenNeuronId(id);
        return (
          <Badge
            key={id.toString()}
            variant="secondary"
            className={cn('text-xs', editable && 'gap-1 pr-1')}
          >
            {name}
            {editable && (
              <button
                className="rounded-sm p-0.5 hover:bg-muted hover:text-destructive disabled:opacity-50"
                disabled={isDisabled}
                onClick={() => onRemove?.(topic, id)}
                data-testid="remove-followee-btn"
              >
                <X className="size-3" />
                <span className="sr-only">{t(($) => $.voting.manageFollowing.remove)}</span>
              </button>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

function IndividualTopicsSection({
  followeesMap,
  knownNeurons,
  editable,
  isDisabled,
  onRemove,
}: {
  followeesMap: Map<Topic, bigint[]>;
  knownNeurons: KnownNeuron[];
  editable: boolean;
  isDisabled: boolean;
  onRemove?: (topic: Topic, followeeId: bigint) => void;
}) {
  const { t } = useTranslation();
  const [expandedTopics, setExpandedTopics] = useState<Set<Topic>>(new Set());

  const toggleTopic = (topic: Topic) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  return (
    <div className="-mx-4 mt-3 flex flex-col border-t pt-1">
      {INDIVIDUAL_TOPICS.map((indTopic) => {
        const { followees, inherited } = getEffectiveFollowees(indTopic.topic, followeesMap);
        const count = followees.length;
        const isOpen = expandedTopics.has(indTopic.topic);
        const isExpandable = count > 0 && !inherited;

        return (
          <div
            key={indTopic.topic}
            className="flex flex-col"
            data-testid={`topic-row-${indTopic.topic}`}
          >
            <button
              className={cn(
                'flex items-center justify-between gap-2 px-4 py-1.5 text-left',
                isExpandable && 'hover:bg-muted/50',
              )}
              onClick={() => isExpandable && toggleTopic(indTopic.topic)}
              disabled={!isExpandable}
            >
              <span className="text-xs">{t(indTopic.labelKey as never)}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {inherited
                    ? t(($) => $.voting.manageFollowing.inherited)
                    : count > 0
                      ? t(($) => $.voting.manageFollowing.followeesCount, { count })
                      : t(($) => $.voting.manageFollowing.noFollowees)}
                </span>
                {isExpandable &&
                  (isOpen ? (
                    <ChevronUp className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  ))}
              </div>
            </button>

            <AnimatedCollapse open={isOpen && isExpandable}>
              <div className="px-4 py-1.5">
                <FolloweeBadges
                  topic={indTopic.topic}
                  followees={followees}
                  knownNeurons={knownNeurons}
                  editable={editable}
                  isDisabled={isDisabled}
                  onRemove={onRemove}
                />
              </div>
            </AnimatedCollapse>
          </div>
        );
      })}
    </div>
  );
}
