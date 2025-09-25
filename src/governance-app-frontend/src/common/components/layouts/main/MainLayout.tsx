import { useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Link } from '@untitledui/components';

import { ToggleThemeButton } from '@components/buttons/toggleTheme/ToggleThemeButton';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  // @TODO: verify resolution of login->logout->login issue.
  const { login, identity, clear, isInitializing } = useInternetIdentity();

  const { t } = useTranslation();
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  // @TODO: identity does not refresh when it auto-expires.
  // Check this again when useInternetIdentity is updated.
  // Kristofer will update the library in the next weeks.
  const { invalidate } = useRouter();
  useEffect(() => {
    invalidate();
  }, [identity, invalidate]);

  return (
    <main
      data-testid="main-layout"
      className="m-auto flex min-h-[100vh] max-w-[1920px] flex-col justify-between gap-2 overflow-hidden p-4"
    >
      {showLoader ? (
        <SkeletonLoader count={6} />
      ) : (
        <>
          <title>{t(($) => $.home.title)}</title>
          <div>
            <div className="flex shrink-0 items-start justify-between gap-2">
              <Link to="/">
                <h1 className="pb-4 text-4xl font-bold text-brand-primary">
                  {t(($) => $.home.title)}
                </h1>
              </Link>
              <div className="flex gap-4">
                <Button to="/nns">{t(($) => $.common.nns)}</Button>
                <Button to="/sns">{t(($) => $.common.sns)}</Button>
                <Button to="/vault/$name" params={{ name: 'John' }} search={{ surname: 'Doe' }}>
                  {t(($) => $.common.vault)}
                </Button>

                <Button
                  data-testid="login-btn"
                  color={identity ? 'secondary-destructive' : 'secondary'}
                  onClick={identity ? clear : login}
                >
                  {identity ? 'Logout' : 'Login with Internet Identity!'}
                </Button>

                <ToggleThemeButton />
              </div>
            </div>
            {children}
          </div>
          <div className="flex flex-col items-center gap-2 pt-4 text-xs">
            <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
          </div>
        </>
      )}
    </main>
  );
};
