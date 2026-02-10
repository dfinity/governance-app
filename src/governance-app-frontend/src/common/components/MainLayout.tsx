import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Sidebar } from '@components/navigation/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-dvh w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-full w-full flex-col overflow-hidden">
        <main className="relative flex-1 overflow-auto bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
