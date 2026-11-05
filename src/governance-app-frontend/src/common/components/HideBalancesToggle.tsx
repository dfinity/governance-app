import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useHideBalances } from '@hooks/useHideBalances';
import { cn } from '@utils/shadcn';

type Props = {
  className?: string;
};

export const HideBalancesToggle = ({ className }: Props) => {
  const { t } = useTranslation();
  const { hidden, setHidden } = useHideBalances();
  const Icon = hidden ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={() => setHidden(!hidden)}
      aria-label={t(($) => (hidden ? $.common.aria.showBalances : $.common.aria.hideBalances))}
      aria-pressed={hidden}
      className={cn(
        // The pseudo-element extends the tap area to about 40px around the small icon.
        'relative inline-flex items-center justify-center rounded-sm text-muted-foreground transition-colors after:absolute after:-inset-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
};
