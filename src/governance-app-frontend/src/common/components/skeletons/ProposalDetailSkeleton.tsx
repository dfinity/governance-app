import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';
import { SkeletonText } from './SkeletonText';

/**
 * The summary card and the body card, without the back link.
 *
 * The page renders its own back link while the proposal query runs, so this
 * stands in for the part below it.
 */
export const ProposalDetailContentSkeleton = () => (
  <SkeletonScreen className="flex flex-col gap-6">
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-9 w-full max-w-2xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent>
        <SkeletonText lines={8} />
      </CardContent>
    </Card>
  </SkeletonScreen>
);

/** Mirrors a single proposal page: back link, summary card, body card. */
export const ProposalDetailSkeleton = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-5 w-40" />
    <ProposalDetailContentSkeleton />
  </div>
);
