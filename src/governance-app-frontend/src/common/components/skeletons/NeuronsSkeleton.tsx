import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';
import { SkeletonStatCard } from './SkeletonStatCard';

/** Mirrors `NeuronCard`: amount, APY badge, and the six label/value rows. */
const SkeletonNeuronCard = () => (
  <Card className="flex h-full flex-col gap-3">
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div className="flex min-w-0 flex-col gap-1">
        <Skeleton className="h-9 w-40 max-w-full" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-9 w-16 shrink-0 rounded-sm" />
    </CardHeader>
    <CardContent className="flex-1">
      <div className="flex flex-col divide-y divide-border/50">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5.5 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * The summary row and the neuron grid, without the page header.
 *
 * The page keeps its own header while the neurons query runs, so this stands in
 * for the part below it.
 */
export const NeuronsContentSkeleton = () => (
  <SkeletonScreen className="flex flex-col gap-6">
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SkeletonNeuronCard />
      <SkeletonNeuronCard />
    </div>
  </SkeletonScreen>
);

/** Mirrors the whole `/neurons` layout. */
export const NeuronsSkeleton = () => (
  <div className="flex flex-col gap-6">
    <SkeletonPageHeader action={true} />
    <NeuronsContentSkeleton />
  </div>
);
