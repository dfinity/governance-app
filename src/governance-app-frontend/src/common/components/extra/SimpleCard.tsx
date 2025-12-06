import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SimpleCard = ({ children, className }: Props) => {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-4 flex h-full flex-col justify-between">
        {children}
      </CardContent>
    </Card>
  );
};
