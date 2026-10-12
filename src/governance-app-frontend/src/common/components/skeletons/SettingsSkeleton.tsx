import { Card } from '@components/Card';
import { Skeleton } from '@components/Skeleton';

import { SkeletonPageHeader } from './SkeletonPageHeader';
import { SkeletonScreen } from './SkeletonScreen';

const SkeletonHeading = ({ description = false }: { description?: boolean }) => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-48" />
    {description && <Skeleton className="h-5 w-80 max-w-full" />}
  </div>
);

const SkeletonRows = ({ rows }: { rows: number }) => (
  <Card className="overflow-hidden p-0">
    <div className="flex flex-col divide-y">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  </Card>
);

const SkeletonTextCard = () => (
  <Card className="p-6">
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40 max-w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  </Card>
);

/**
 * Mirrors the `/settings` sections in order: identity, address book, advanced
 * features, governance, appearance, session, and the version footer.
 */
export const SettingsSkeleton = () => (
  <SkeletonScreen className="flex min-h-full flex-col gap-12">
    <SkeletonPageHeader />
    <section className="flex flex-col gap-4">
      <SkeletonHeading description />
      <SkeletonRows rows={3} />
    </section>
    <section className="flex flex-col gap-4">
      <SkeletonHeading />
      <SkeletonRows rows={1} />
    </section>
    <section className="flex flex-col gap-4">
      <SkeletonHeading />
      <SkeletonRows rows={4} />
    </section>
    <section className="flex flex-col gap-4">
      <SkeletonHeading />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonTextCard />
        <SkeletonTextCard />
      </div>
    </section>
    <section className="flex flex-col gap-4">
      <SkeletonHeading />
      <SkeletonRows rows={4} />
    </section>
    <section className="flex flex-col gap-4">
      <SkeletonHeading description />
      <Skeleton className="h-10 w-full sm:w-32" />
    </section>
    <Skeleton className="mt-auto h-4 w-32 self-center" />
  </SkeletonScreen>
);
