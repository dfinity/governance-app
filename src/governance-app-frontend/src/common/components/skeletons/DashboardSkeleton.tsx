import { Card, CardContent, CardHeader } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';
import { SkeletonStatCard } from './SkeletonStatCard';
import { SkeletonText } from './SkeletonText';

/** Mirrors `AccountCard`: header action, balance, then the two stacked actions. */
const SkeletonDashboardAccountCard = () => (
  <Card className="pt-4 pb-6">
    <CardHeader className="flex flex-col gap-0">
      <div className="flex min-h-9 w-full items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="size-9 rounded-md" />
      </div>
      <div className="flex flex-col gap-0.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-between gap-6">
      <div className="mt-auto flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </CardContent>
  </Card>
);

/** Mirrors `AccountsCard` while it loads: count, balance, two preview rows, action. */
const SkeletonDashboardAccountsCard = () => (
  <Card className="pt-4 pb-6">
    <CardHeader className="flex flex-col gap-0">
      <div className="flex min-h-9 items-center gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="size-5 rounded-full" />
      </div>
      <div className="flex flex-col gap-0.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-between gap-6">
      <div className="flex flex-col divide-y">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between py-2.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <Skeleton className="h-12 w-full" />
      </div>
    </CardContent>
  </Card>
);

type Props = {
  /** Mirrors the subaccounts feature, which swaps `AccountCard` for `AccountsCard`. */
  subaccounts?: boolean;
};

/** Mirrors the `/dashboard` layout, so the real page lands in the same frame. */
export const DashboardSkeleton = ({ subaccounts = false }: Props) => (
  <SkeletonScreen className="flex flex-col gap-8">
    {/* SmartTitle */}
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-10 w-full max-w-md" />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {/* TotalAssetsCard, with its radial chart. */}
      <Card className="items-center pt-4 pb-6">
        <CardHeader className="flex flex-col items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-40" />
        </CardHeader>
        <CardContent className="flex w-full justify-center">
          <Skeleton className="aspect-square w-full max-w-48 rounded-full" />
        </CardContent>
      </Card>

      {subaccounts ? <SkeletonDashboardAccountsCard /> : <SkeletonDashboardAccountCard />}

      {/* StakedCard. */}
      <Card className="pt-4 pb-6 md:col-span-2">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6 border-t pt-4">
            <Skeleton className="h-7 w-20 justify-self-end" />
            <Skeleton className="h-7 w-20 justify-self-end" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="mt-4 flex flex-col gap-3">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard caption={false} />
      </div>

      {/* ExecutiveSummaryCard. */}
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <SkeletonText lines={4} />
          <SkeletonText lines={4} />
        </CardContent>
      </Card>
    </div>
  </SkeletonScreen>
);
