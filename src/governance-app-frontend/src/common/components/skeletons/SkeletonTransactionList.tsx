import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  count?: number;
};

/**
 * Mirrors `AccountTransactionItem` for a transfer: icon, label, timestamp,
 * address, and the amount. The amount sits below the details on a phone and
 * in its own column from `sm` up.
 */
export const SkeletonTransactionList = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="p-0">
        <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-0">
            <Skeleton className="col-start-1 row-span-2 row-start-1 size-11 self-center rounded-full sm:row-span-1" />
            <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
              <Skeleton className="h-5 w-28 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
              {/* The address line is as tall as its copy button. */}
              <div className="flex h-8 items-center">
                <Skeleton className="h-5 w-48 max-w-full" />
              </div>
            </div>
            <Skeleton className="col-start-2 row-start-2 h-6 w-24 sm:col-start-3 sm:row-start-1" />
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
