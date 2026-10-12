import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';
import { SkeletonText } from './SkeletonText';

/**
 * The summary card and the voting card, without the back link.
 *
 * The page renders its own back link while the proposal query runs, so this
 * stands in for the part below it.
 */
export const ProposalDetailContentSkeleton = () => (
  <SkeletonScreen className="flex flex-col gap-6">
    {/* Summary card: id, title, badges, then the Markdown summary. */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="mt-2 h-9 w-full max-w-2xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonText lines={8} />
      </CardContent>
    </Card>

    {/* ProposalDetailsVoting: vote bar, then the four totals. */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </SkeletonScreen>
);

/** Mirrors a single proposal page: back link, summary card, voting card. */
export const ProposalDetailSkeleton = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-5 w-40" />
    <ProposalDetailContentSkeleton />
  </div>
);
