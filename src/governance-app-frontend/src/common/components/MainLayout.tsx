import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Header } from '@components/navigation/Header';
import { Sidebar } from '@components/navigation/Sidebar';
import { useThemeShortcut } from '@hooks/useThemeShortcut';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { isInitializing } = useInternetIdentity();

  useThemeShortcut();

  if (isInitializing) return null;
  return (
    <div className="flex min-h-screen w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <Header />
        <main className="relative mb-20 flex-1 overflow-auto bg-main-content p-4 lg:mb-0">
          <div className="mx-auto w-full max-w-5xl pb-4">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
