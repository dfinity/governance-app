import {
  CircleCheckBig,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Toaster, type ToasterProps } from 'sonner';

import { useTheme } from '@hooks/useTheme';

const getBodyTheme = () => (document.body.classList.contains('dark') ? 'dark' : null);

const subscribeToBodyClass = (callback: () => void) => {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const Sonner = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const bodyTheme = useSyncExternalStore(subscribeToBodyClass, getBodyTheme);

  return (
    <Toaster
      theme={(bodyTheme ?? theme) as ToasterProps['theme']}
      className="toaster group"
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
