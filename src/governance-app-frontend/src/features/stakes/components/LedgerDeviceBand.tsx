import { Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@utils/shadcn';

type Props = {
  name: string;
  className?: string;
};

// In dark mode `bg-muted` equals the card color, so the band uses the page background there.
export const LedgerDeviceBand = ({ name, className }: Props) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 border-b bg-muted py-2 text-xs font-medium text-foreground-secondary dark:bg-background',
        className,
      )}
      data-testid="neuron-ledger-device-band"
    >
      <Usb className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(($) => $.neuron.ledgerDeviceBand, { name })}</span>
    </div>
  );
};
