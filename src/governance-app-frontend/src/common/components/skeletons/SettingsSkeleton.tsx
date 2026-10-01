import { Card } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';

const SkeletonSection = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-8 w-48" />
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between px-6 py-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);

/** Mirrors the `/settings` layout: stacked sections of divided rows. */
export const SettingsSkeleton = () => (
  <SkeletonScreen className="flex flex-col gap-12">
    <SkeletonPageHeader />
    <SkeletonSection rows={3} />
    <SkeletonSection rows={1} />
    <SkeletonSection rows={4} />
  </SkeletonScreen>
);
