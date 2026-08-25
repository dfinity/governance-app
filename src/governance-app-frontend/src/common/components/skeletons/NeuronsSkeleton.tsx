import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';
import { SkeletonStatCard } from './SkeletonStatCard';

/** One card in the neurons grid. */
const SkeletonNeuronCard = () => (
  <Card className="h-full">
    <CardHeader className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-5 w-24" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24 justify-self-end" />
      </div>
      <Skeleton className="h-12 w-full" />
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
