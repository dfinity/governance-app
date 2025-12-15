import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';

import { BottomNav } from '@components/navigation/BottomNav';
import { Header } from '@components/navigation/Header';
import { Sidebar } from '@components/navigation/Sidebar';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { isInitializing } = useInternetIdentity();

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  return (
    <div className="flex min-h-screen w-full bg-background" data-testid="main-layout">
      {showLoader ? (
        <div className="h-full w-full p-4">
          <SkeletonLoader count={6} />
        </div>
      ) : (
        <>
          <Sidebar />
          <div className="flex h-screen w-full flex-col overflow-hidden">
            <Header />
            <main className="relative mb-16 flex-1 overflow-auto p-6 lg:mb-0">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
            <BottomNav />
          </div>
        </>
      )}
    </div>
  );
};
