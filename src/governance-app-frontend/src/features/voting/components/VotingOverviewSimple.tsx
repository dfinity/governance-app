import { type KnownNeuron, type NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { EmptyActionState } from '@components/EmptyActionState';
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
        <Alert variant="warning">
          <AlertTitle className="font-semibold">
            {t(($) => $.voting.warnings.followingMismatchTitle)}
          </AlertTitle>
          <AlertDescription>{t(($) => $.voting.warnings.followingMismatch)}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (isNullish(followedNeuron)) {
    return (
      <EmptyActionState
        icon={Users}
        title={t(($) => $.voting.noFollowing.title)}
        description={t(($) => $.voting.noFollowing.body)}
        ctaLabel={t(($) => $.voting.noFollowing.cta)}
        ctaIcon={Users}
        onCtaClick={onManageFollowing}
      />
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
