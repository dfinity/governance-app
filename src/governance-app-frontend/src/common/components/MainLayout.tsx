import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Header } from '@components/navigation/Header';
import { Sidebar } from '@components/navigation/Sidebar';
import { useThemeShortcut } from '@hooks/useThemeShortcut';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  useThemeShortcut();

  return (
    <div className="flex min-h-screen w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <Header />
        <main className="relative mb-20 flex-1 overflow-auto bg-main-content p-4 pt-6 md:pt-8 lg:mb-0">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
