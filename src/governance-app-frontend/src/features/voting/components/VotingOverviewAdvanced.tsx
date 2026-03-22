import { type KnownNeuron, type NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card, CardContent } from '@components/Card';
import { PageHeader } from '@components/PageHeader';
import { Skeleton } from '@components/Skeleton';

import {
  getConfiguredTopicCount,
  getConsistentTopicFollowees,
  TOTAL_TOPIC_COUNT,
} from '../utils/topicFollowing';
import { TopicFollowingAccordion } from './TopicFollowingAccordion';

type Props = {
  userNeurons: NeuronInfo[];
  knownNeurons: KnownNeuron[];
  isLoading: boolean;
  onManageFollowing: () => void;
};

export function VotingOverviewAdvanced({
  userNeurons,
  knownNeurons,
  isLoading,
  onManageFollowing,
}: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (userNeurons.length === 0) {
    return <EmptyState onManageFollowing={onManageFollowing} />;
  }

  const consistentFollowees = getConsistentTopicFollowees(userNeurons);
  const isInconsistent = consistentFollowees === null;
  const configuredCount = consistentFollowees ? getConfiguredTopicCount(consistentFollowees) : 0;

  return (
    <>
      <PageHeader
        title={t(($) => $.voting.overview.title)}
        description={
          isInconsistent
            ? t(($) => $.voting.overview.inconsistent.subtitle)
            : t(($) => $.voting.overview.description)
        }
        actions={
          <Button size="xl" className="w-full sm:w-auto" onClick={onManageFollowing}>
            <Users />
            {t(($) => $.voting.overview.cta)}
          </Button>
        }
      />

      {isInconsistent ? (
        <Alert variant="warning">
          <AlertTriangle className="size-4" />
          <AlertTitle className="font-semibold">
            {t(($) => $.voting.overview.inconsistent.title)}
          </AlertTitle>
          <AlertDescription>{t(($) => $.voting.overview.inconsistent.body)}</AlertDescription>
        </Alert>
      ) : (
        <Card className="p-0">
          <CardContent className="flex flex-col divide-y p-0">
            <StatusHeader configuredCount={configuredCount} />
            <TopicFollowingAccordion
              followeesMap={consistentFollowees}
              knownNeurons={knownNeurons}
              mode="summary"
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Card className="mt-2 p-0">
        <CardContent className="flex flex-col divide-y p-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ onManageFollowing }: { onManageFollowing: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
        <Users className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-semibold">{t(($) => $.voting.overview.noNeurons.title)}</h3>
      <p className="max-w-sm text-base text-muted-foreground">
        {t(($) => $.voting.overview.noNeurons.body)}
      </p>
      <div className="flex flex-col gap-3 pt-2 sm:items-center">
        <Button size="xl" className="w-full sm:w-auto" onClick={onManageFollowing}>
          <Users />
          {t(($) => $.voting.overview.noNeurons.cta)}
        </Button>
      </div>
    </div>
  );
}

function StatusHeader({ configuredCount }: { configuredCount: number }) {
  const { t } = useTranslation();

  const label =
    configuredCount === TOTAL_TOPIC_COUNT
      ? t(($) => $.voting.overview.allCovered, { total: TOTAL_TOPIC_COUNT })
      : configuredCount === 0
        ? t(($) => $.voting.overview.noneCovered)
        : t(($) => $.voting.overview.someCovered, {
            count: configuredCount,
            total: TOTAL_TOPIC_COUNT,
          });

  const isFullyCovered = configuredCount === TOTAL_TOPIC_COUNT;

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {isFullyCovered ? (
        <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
      ) : (
        <AlertTriangle className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
