import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonAccountCard } from './SkeletonAccountCard';
import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonTransactionRows } from './SkeletonTransactionList';

/**
 * Mirrors the `/accounts` layout: total card, account list, recent activity.
 *
 * `SkeletonTransactionRows` inside announces the load, so this wrapper stays a
 * plain `div`. Nested status regions read twice.
 */
export const AccountsSkeleton = () => (
  <div className="flex flex-col gap-6">
    <SkeletonPageHeader action={true} />

    <Card>
      <CardHeader className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <SkeletonAccountCard />
        <SkeletonAccountCard />
      </div>

      <Card className="h-fit">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <SkeletonTransactionRows />
        </CardContent>
      </Card>
    </div>
  </div>
);
