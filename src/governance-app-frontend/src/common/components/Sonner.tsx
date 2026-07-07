import {
  CircleCheckBig,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster, type ToasterProps } from 'sonner';

import { useTheme } from '@hooks/useTheme';

const Sonner = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  /*
   * mobileOffset: Includes safe-area-inset-top for iOS PWA notch support.
   * Note: This assumes toasts appear at the top (default). If position changes
   * to bottom-*, update to use safe-area-inset-bottom instead.
   */
  return (
    <Toaster
      theme={theme}
      className="toaster group"
      mobileOffset="calc(0.5rem + env(safe-area-inset-top))"
      icons={{
        success: <CircleCheckBig className="size-4 text-emerald-700 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-700 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
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
