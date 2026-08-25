import { Skeleton } from '@components/Skeleton';
import { cn } from '@utils/shadcn';

type Size = 'sm' | 'base' | 'lg';

type Props = {
  /** Number of bars. The last one is short, the way a paragraph ends. */
  lines?: number;
  /** Matches the text scale the bars stand in for. */
  size?: Size;
  className?: string;
};

const heights: Record<Size, string> = {
  sm: 'h-3',
  base: 'h-3.5',
  lg: 'h-4',
};

const gaps: Record<Size, string> = {
  sm: 'gap-2',
  base: 'gap-2.5',
  lg: 'gap-3',
};

export const SkeletonText = ({ lines = 3, size = 'base', className }: Props) => (
  <div className={cn('flex flex-col', gaps[size], className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={cn(heights[size], index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')}
      />
    ))}
  </div>
);
