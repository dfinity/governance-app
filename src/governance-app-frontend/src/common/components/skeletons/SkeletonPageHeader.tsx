import { Skeleton } from '@components/Skeleton';

type Props = {
  /** Mirrors `PageHeader`, which drops the paragraph when there is none. */
  description?: boolean;
  action?: boolean;
};

/** Matches the shape of `PageHeader`. */
export const SkeletonPageHeader = ({ description = true, action = false }: Props) => (
  <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-56" />
      {description && <Skeleton className="h-5 w-72 max-w-full" />}
    </div>
    {action && <Skeleton className="h-12 w-full sm:w-40" />}
  </div>
);
