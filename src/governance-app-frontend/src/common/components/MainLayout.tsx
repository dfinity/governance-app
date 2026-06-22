import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Sidebar } from '@components/navigation/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative z-10 flex h-dvh w-full" data-testid="main-layout">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-full w-full flex-col overflow-hidden">
        <main
          id="main-content"
          className="relative flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-8 lg:pb-8"
        >
          <div className="mx-auto min-h-full w-full max-w-295">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
