import { Skeleton } from '@components/Skeleton';

type Props = {
  count?: number;
  width?: number | string;
  height?: number | string;
};

/**
 * @deprecated Replaced with a better implementation in components/Skeleton.tsx
 */
export const SkeletonLoader = (props: Props) => {
  const { width = '100%', height = 16, count = 1 } = props;

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} style={{ width, height }} />
      ))}
    </div>
  );
};
