import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  count?: number;
};

/** Mirrors `AccountTransactionItem`: icon, label, timestamp, amount. */
export const SkeletonTransactionList = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="p-0">
        <CardContent className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex w-full min-w-0 flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </SkeletonScreen>
);

/** The compact variant used inside the recent activity card. */
export const SkeletonTransactionRows = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </SkeletonScreen>
);
