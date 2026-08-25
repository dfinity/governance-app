import { Skeleton } from '@components/Skeleton';

import { SkeletonScreen } from './SkeletonScreen';

type Props = {
  count?: number;
};

/** Mirrors `AddressBookEntry`: name, address, two icon buttons, in a box. */
export const SkeletonAddressBookRows = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-2">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        <div className="flex shrink-0 gap-1">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    ))}
  </SkeletonScreen>
);

/** Mirrors a picker row: leading control plus a label. */
export const SkeletonPickerRows = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col divide-y">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 p-4">
        <Skeleton className="size-6 shrink-0 rounded-md" />
        <Skeleton className="h-5 w-48" />
      </div>
    ))}
  </SkeletonScreen>
);

/** Mirrors a topic row in the following accordion: dot, name, trailing value. */
export const SkeletonTopicRows = ({ count = 3 }: Props) => (
  <SkeletonScreen className="flex flex-col gap-4 py-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </SkeletonScreen>
);
