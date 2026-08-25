import { Card, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  count?: number;
};

/** One row of the proposals list, badges and vote bar included. */
const SkeletonProposalCard = () => (
  <Card className="w-full overflow-hidden">
    <CardHeader className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>

      <Skeleton className="h-6 w-full max-w-2xl" />

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex w-full min-w-[200px] flex-1 items-center gap-2 lg:ml-auto lg:w-auto lg:max-w-[500px]">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-2 flex-grow rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </CardHeader>
  </Card>
);

/** Stands in for the proposals list, in the page and in the infinite scroll. */
export const ProposalListSkeleton = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonProposalCard key={index} />
    ))}
  </SkeletonScreen>
);
