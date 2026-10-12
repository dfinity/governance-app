import { type KnownNeuron, type NeuronInfo } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { EmptyActionState } from '@components/EmptyActionState';
import { PageHeader } from '@components/PageHeader';
import { SkeletonSimpleFollowingCard } from '@components/skeletons/SkeletonFollowingCard';
import { SkeletonPageHeader } from '@components/skeletons/SkeletonPageHeader';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';

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
      <SkeletonScreen className="flex flex-col gap-6">
        <SkeletonPageHeader action={true} />
        <SkeletonSimpleFollowingCard />
      </SkeletonScreen>
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
