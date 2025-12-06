import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  message: string;
  className?: string;
};

export const WarningMessage = ({ message, className }: Props) => (
  <p className={cn('flex items-center gap-1 text-sm font-bold text-orange-600', className)}>
    <AlertCircle className="inline" size={16} /> {message}
  </p>
);
