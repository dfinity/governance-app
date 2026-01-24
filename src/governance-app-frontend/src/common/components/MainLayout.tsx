import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Header } from '@components/navigation/Header';
import { Sidebar } from '@components/navigation/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <Header />
        <main className="relative mb-[calc(5rem+env(safe-area-inset-bottom))] flex-1 overflow-auto bg-main-content px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 md:mb-0 md:px-8 md:pt-8 md:pb-8 lg:mb-0">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
