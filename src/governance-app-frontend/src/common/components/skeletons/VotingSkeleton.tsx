import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';

import { SkeletonProposalCards } from './ProposalListSkeleton';
import {
  SkeletonAdvancedFollowingCard,
  SkeletonSimpleFollowingCard,
} from './SkeletonFollowingCard';
import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  /** Mirrors the `showProposals` search param, which shows the list. */
  showProposals?: boolean;
  /** Mirrors the advanced following feature, which swaps the overview card. */
  advancedFollowing?: boolean;
};

/** Mirrors the `/voting` layout: header, following card, proposals toggle, list. */
export const VotingSkeleton = ({ showProposals = false, advancedFollowing = false }: Props) => (
  <SkeletonScreen className="flex flex-col gap-6 lg:gap-8">
    <SkeletonPageHeader action={true} />

    {advancedFollowing ? <SkeletonAdvancedFollowingCard /> : <SkeletonSimpleFollowingCard />}

    <Separator className="mt-8 mb-4 lg:mt-16" />

    <div className="mx-auto flex flex-col items-center gap-3">
      <Skeleton className="h-5 w-64 max-w-full" />
      <Skeleton className="h-8 w-36" />
    </div>

    {showProposals && (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-56 rounded-full" />
        <SkeletonProposalCards />
      </div>
    )}
  </SkeletonScreen>
);
