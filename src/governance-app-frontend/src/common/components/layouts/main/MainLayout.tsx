import { useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Link } from '@untitledui/components';

import { ToggleThemeButton } from '@components/buttons/toggleTheme/ToggleThemeButton';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const { login, identity, clear, isInitializing } = useInternetIdentity();
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;
  const { invalidate } = useRouter();

  const { t } = useTranslation();

  return (
    <main
      data-testid="main-layout"
      className="m-auto flex h-[100vh] max-w-[1920px] flex-col justify-between gap-2 bg-primary p-4"
    >
      {showLoader ? (
        <SkeletonLoader count={3} height={100} />
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
                  onClick={
                    identity
                      ? () => {
                          clear();
                          invalidate();
                        }
                      : login
                  }
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
