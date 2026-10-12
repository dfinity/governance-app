import { Card, CardContent, CardHeader } from '@components/Card';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';

/** Mirrors `AccountsListItem`: name, account id, balance, last transaction. */
export const SkeletonAccountCard = () => (
  <Card className="gap-3">
    <CardHeader className="flex flex-col gap-0">
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="size-9 rounded-md" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Separator className="my-1" />
      <Skeleton className="h-5 w-full" />
    </CardContent>
  </Card>
);
