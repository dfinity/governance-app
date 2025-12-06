import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SimpleCard = ({ children, className }: Props) => {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex h-full flex-col justify-between p-4">{children}</CardContent>
    </Card>
  );
};
