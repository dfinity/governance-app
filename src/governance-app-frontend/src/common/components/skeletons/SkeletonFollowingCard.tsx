import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

/** Mirrors `FollowedNeuronCard` in the simple voting overview. */
export const SkeletonSimpleFollowingCard = () => (
  <Card className="p-0">
    <CardContent className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <Skeleton className="h-6 w-48 max-w-full" />
      </div>
      <Skeleton className="h-8 w-36 shrink-0" />
    </CardContent>
  </Card>
);

/** Mirrors the topic rows card in the advanced voting overview. */
export const SkeletonAdvancedFollowingCard = () => (
  <Card className="p-0">
    <CardContent className="flex flex-col divide-y p-0">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </CardContent>
  </Card>
);
