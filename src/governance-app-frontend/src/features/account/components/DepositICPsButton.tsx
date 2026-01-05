import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Download } from 'lucide-react';

import { Button } from '@components/button';
import { cn } from '@utils/shadcn';

type Props = {
  accountId: AccountIdentifier;
};

export const DepositICPsButton = ({ accountId }: Props) => {
  const isPending = false;

  return (
    <Button variant="outline" size="lg" className={cn('flex-1', isPending && 'opacity-50')}>
      <Download />
      Deposit
    </Button>
  );
};
