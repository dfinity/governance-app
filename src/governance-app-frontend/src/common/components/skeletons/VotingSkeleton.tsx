import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { ProposalListSkeleton } from './ProposalListSkeleton';
import { SkeletonPageHeader } from './SkeletonPageHeader';

/**
 * Mirrors the `/voting` layout: header, following card, proposals list.
 *
 * `ProposalListSkeleton` inside announces the load, so this wrapper stays a
 * plain `div`. Nested status regions read twice.
 */
export const VotingSkeleton = () => (
  <div className="flex flex-col gap-6">
    <SkeletonPageHeader action={true} />

    {/* FollowedNeuronCard. */}
    <Card className="p-0">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-36" />
      </CardContent>
    </Card>

    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-56 rounded-full" />
      <ProposalListSkeleton />
    </div>
  </div>
);
