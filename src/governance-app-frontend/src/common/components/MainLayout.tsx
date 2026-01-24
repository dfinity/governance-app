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
         * Mobile-first layout optimizations:
         *
         * pt-[calc(0.5rem+env(safe-area-inset-top))]:
         *   - Minimal 8px top padding on mobile (Header is hidden)
         *   - safe-area-inset-top handles the notch on iOS PWA (standalone mode)
         *
         * pb-2: Reduced bottom padding (8px) on mobile to maximize vertical space
         *
         * mb-[calc(5rem+env(safe-area-inset-bottom))]:
         *   - 5rem (80px) accounts for BottomNav height
         *   - safe-area-inset-bottom handles the home indicator on iOS
         *
         * md:* breakpoints restore comfortable padding on tablets/desktop where
         * the Header is visible and BottomNav is hidden (Sidebar takes over)
         */}
        <main className="relative mb-[calc(5rem+env(safe-area-inset-bottom))] flex-1 overflow-auto bg-main-content px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 md:mb-0 md:px-8 md:pt-8 md:pb-8 lg:mb-0">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
