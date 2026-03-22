import { type KnownNeuron, type NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { PageHeader } from '@components/PageHeader';
import { Skeleton } from '@components/Skeleton';

import { hasComplexFollowing } from '../utils/topicFollowing';
import { FollowedNeuronCard } from './FollowedNeuronCard';

type Props = {
  followedNeuron: KnownNeuron | bigint | undefined;
  userNeurons: NeuronInfo[];
  isLoading: boolean;
  onManageFollowing: () => void;
};

export function VotingOverviewSimple({
  followedNeuron,
  userNeurons,
  isLoading,
  onManageFollowing,
}: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (hasComplexFollowing(userNeurons)) {
    return (
      <>
        <Alert variant="warning">
          <AlertTitle className="font-semibold">
            {t(($) => $.voting.warnings.followingMismatchTitle)}
          </AlertTitle>
          <AlertDescription>{t(($) => $.voting.warnings.followingMismatch)}</AlertDescription>
        </Alert>
        <Button size="xl" className="w-full sm:w-auto" onClick={onManageFollowing}>
          <Users />
          {t(($) => $.voting.cta)}
        </Button>
      </>
    );
  }

  if (isNullish(followedNeuron)) {
    return (
      <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
          <Users className="size-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold">{t(($) => $.voting.noFollowing.title)}</h3>
        <p className="max-w-sm text-base text-muted-foreground">
          {t(($) => $.voting.noFollowing.body)}
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:items-center">
          <Button size="xl" className="w-full sm:w-auto" onClick={onManageFollowing}>
            <Users />
            {t(($) => $.voting.noFollowing.cta)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t(($) => $.voting.title)}
        description={t(($) => $.voting.description)}
        actions={
          <Button size="xl" className="w-full sm:w-auto" onClick={onManageFollowing}>
            <Users />
            {t(($) => $.voting.cta)}
          </Button>
        }
      />
      <FollowedNeuronCard neuron={followedNeuron} />
    </>
  );
}
