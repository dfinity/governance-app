import { ReactNode, useEffect, useRef } from 'react';

import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { Sidebar } from '@components/navigation/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const layoutRef = useRef<HTMLDivElement>(null);

  // iOS standalone PWA: CSS viewport units (dvh) and fixed positioning can
  // report incorrect dimensions during the PWA launch animation, causing the
  // layout to be mis-sized until the user interacts. Using window.innerHeight
  // bypasses CSS viewport units entirely — it queries the actual viewport at
  // call time — and the resize listener keeps it in sync.
  useEffect(() => {
    const updateHeight = () => {
      layoutRef.current?.style.setProperty('height', `${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div ref={layoutRef} className="flex h-dvh w-full bg-background" data-testid="main-layout">
      <WelcomeModal />
      <Sidebar />
      <div className="flex h-full w-full flex-col overflow-hidden">
        <main className="relative flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
