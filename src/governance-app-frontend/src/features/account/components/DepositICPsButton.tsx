import { Download } from 'lucide-react';

import { Button } from '@components/button';
import { cn } from '@utils/shadcn';

export const DepositICPsButton = () => {
  const isPending = false;

  return (
    <Button variant="outline" size="lg" className={cn('flex-1', isPending && 'opacity-50')}>
      <Download />
      Deposit
    </Button>
  );
};
