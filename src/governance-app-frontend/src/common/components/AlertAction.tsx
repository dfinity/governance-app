import { AlertCircle } from 'lucide-react';

import { cn } from '@utils/shadcn';

interface AlertActionProps {
  onClick?: () => void;
  className?: string;
}

export function AlertAction({ onClick, className = '' }: AlertActionProps) {
  return (
    <div
      className={cn(
        'cursor-pointer rounded-sm border border-orange-300 bg-orange-100 p-0.5 transition-all duration-300 hover:scale-110',
        className,
      )}
      onClick={onClick}
      role="button"
    >
      <AlertCircle className="size-5 text-orange-400" />
    </div>
  );
}
