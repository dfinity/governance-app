import { CircleCheckBig, InfoIcon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster, type ToasterProps } from 'sonner';

import { Spinner } from '@components/Spinner';
import { useTheme } from '@hooks/useTheme';

const Sonner = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      className="toaster group"
      // Each side clears its own safe-area inset (notch, home indicator, gesture bar).
      mobileOffset={{
        top: 'calc(0.5rem + env(safe-area-inset-top))',
        right: 'calc(0.5rem + env(safe-area-inset-right))',
        bottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
        left: 'calc(0.5rem + env(safe-area-inset-left))',
      }}
      icons={{
        success: <CircleCheckBig className="size-4 text-emerald-700 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-700 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-4" />,
        // The toast is already a live region, so the spinner adds no second status.
        loading: <Spinner aria-hidden />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Sonner };
