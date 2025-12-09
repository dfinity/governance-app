import { Card, CardContent } from '@ui/card';

import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SimpleCard = ({ children, className }: Props) => {
  return (
    <Card className={cn('h-full cursor-pointer transition-colors hover:bg-muted/50', className)}>
      <CardContent className="flex h-full flex-col justify-between p-4">{children}</CardContent>
    </Card>
  );
};
