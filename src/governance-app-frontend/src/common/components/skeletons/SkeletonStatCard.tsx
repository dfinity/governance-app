import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { cn } from '@utils/shadcn';

type Props = {
  /** Mirrors the cards that carry a second, smaller line under the value. */
  caption?: boolean;
  className?: string;
};

/** Matches the small dashboard and stakes cards: label, value, caption. */
export const SkeletonStatCard = ({ caption = true, className }: Props) => (
  <Card className={cn('gap-3 py-4', className)}>
    <CardContent>
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-7 w-32 md:h-8" />
      {caption && <Skeleton className="mt-1 h-5 w-20" />}
    </CardContent>
  </Card>
);
