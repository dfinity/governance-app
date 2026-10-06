import { Card, CardContent } from '@components/Card';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';

import { SkeletonProposalCards } from './ProposalListSkeleton';
import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  /** Mirrors the `showProposals` search param, which shows the list. */
  showProposals?: boolean;
};

/** Mirrors the `/voting` layout: header, following card, proposals toggle, list. */
export const VotingSkeleton = ({ showProposals = false }: Props) => (
  <SkeletonScreen className="flex flex-col gap-6 lg:gap-8">
    <SkeletonPageHeader action={true} />

    {/* FollowedNeuronCard. */}
    <Card className="p-0">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <Skeleton className="h-6 w-48 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36 shrink-0" />
      </CardContent>
    </Card>

    <Separator className="mt-8 mb-4 lg:mt-16" />

    <div className="mx-auto flex flex-col items-center gap-3">
      <Skeleton className="h-5 w-64 max-w-full" />
      <Skeleton className="h-8 w-36" />
    </div>

    {showProposals && (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-56 rounded-full" />
        <SkeletonProposalCards />
      </div>
    )}
  </SkeletonScreen>
);
