import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { type LoginSource, setLoginSource } from '@features/analytics/useLoginAnalytics';

import { Button } from '@components/button';
import { useInternetIdentity } from '@hooks/useInternetIdentity';

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'disabled'> & {
  source: LoginSource;
};

/** Starts a login from a public page. The page stays, and the session replaces the reader view. */
export const ReaderLoginButton = ({ source, children, ...props }: Props) => {
  const { t } = useTranslation();
  const { login, canLogin, isLoggingIn } = useInternetIdentity();

  return (
    <Button
      {...props}
      // A second click during the login starts it again, for a popup that was closed or lost.
      disabled={!canLogin && !isLoggingIn}
      aria-busy={isLoggingIn}
      onClick={() => {
        setLoginSource(source);
        login();
      }}
    >
      {children ?? t(($) => $.reader.login)}
    </Button>
  );
};
