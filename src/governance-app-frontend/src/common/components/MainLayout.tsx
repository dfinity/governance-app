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
        {/*
         * Mobile/tablet-first layout optimizations (up to lg breakpoint):
         *
         * pt-[calc(0.5rem+env(safe-area-inset-top))]:
         *   - Minimal 8px top padding on mobile/tablet (Header is hidden)
         *   - safe-area-inset-top handles the notch on iOS PWA (standalone mode)
         *
         * pb-2: Reduced bottom padding (8px) to maximize vertical space
         *
         * mb-[calc(4rem+env(safe-area-inset-bottom))]:
         *   - 4rem (64px) matches BottomNav h-16 height
         *   - safe-area-inset-bottom handles the home indicator on iOS
         *
         * lg:* breakpoints restore comfortable padding on desktop where
         * the Header is visible and BottomNav is hidden (Sidebar takes over)
         */}
        <main className="relative mb-[calc(4rem+env(safe-area-inset-bottom))] flex-1 overflow-auto bg-main-content px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 lg:mb-0 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
