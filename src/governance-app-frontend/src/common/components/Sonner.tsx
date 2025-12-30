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

  return (
    <Toaster
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckBig className="size-4 text-emerald-700 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
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
      toastOptions={{
        classNames: {
          success: 'border-green-500/50',
        },
      }}
      {...props}
    />
  );
};

export { Sonner };
