import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Sidebar } from '@components/navigation/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className="relative z-10 flex min-h-dvh w-full lg:h-dvh standalone:min-h-screen lg:standalone:h-screen"
      data-testid="main-layout"
    >
      <WelcomeModal />
      {/* Backdrop for the status bar, which overlays the page in the Home Screen web app. */}
      <div
        aria-hidden={true}
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background/95 backdrop-blur-sm"
      />
      <Sidebar />
      {/* Below `lg` the document scrolls, so mobile browsers can collapse their toolbars. */}
      <div className="relative flex w-full flex-col lg:h-full lg:overflow-hidden">
        <main className="relative flex-1 overflow-x-clip bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(var(--bottom-nav-space)+1rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto min-h-full w-full max-w-295">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
