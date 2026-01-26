import { Skeleton } from '@components/Skeleton';

type Props = {
  count: number;
};

export const MultipleSkeletons = ({ count }: Props) => {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
};
