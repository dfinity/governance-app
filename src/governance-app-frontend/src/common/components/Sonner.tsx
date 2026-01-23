import { isNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import {
  CircleCheckBig,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster, type ToasterProps } from 'sonner';

import { useTheme } from '@hooks/useTheme';

// @TODO: Investigate why sonner fails to update theme when user navigates to non-auth pages with light theme
// The body theme is hardcoded to dark for non-auth pages
const NON_AUTH_THEME = 'dark';

const Sonner = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const { identity } = useInternetIdentity();

  return (
    <Toaster
      theme={isNullish(identity) ? NON_AUTH_THEME : theme}
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
