import { ReactNode } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Sidebar } from '@components/navigation/Sidebar';
import { isPwa } from '@hooks/usePwaBootReady';
import { cn } from '@utils/shadcn';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const pwa = isPwa();

  return (
    <div className="flex h-dvh min-h-dvh w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-full w-full flex-col overflow-hidden">
        <main
          className={cn(
            'relative flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-8 lg:pb-8',
            pwa && 'pb-[calc(2.75rem+env(safe-area-inset-bottom))] lg:pb-8',
          )}
        >
          <div className="mx-auto w-full max-w-295">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
