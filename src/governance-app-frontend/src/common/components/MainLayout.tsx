import { ComponentProps, ReactNode } from 'react';

import { NewFeatureModal } from '@features/onboarding/NewFeatureModal';
import { WelcomeModal } from '@features/onboarding/WelcomeModal';

import { BottomNav } from '@components/navigation/BottomNav';
import { MobileHeader } from '@components/navigation/MobileHeader';
import { Sidebar } from '@components/navigation/Sidebar';

type AppFrameProps = ComponentProps<'div'> & {
  /** Marks the navigation item of this path, for a frame that renders before its route. */
  activeHref?: string;
  /** `reader`: a signed-out visitor on a public page. */
  variant?: 'app' | 'reader';
};

/** The sidebar, the bottom navigation, and the main area of the signed-in app. */
export const AppFrame = ({ children, activeHref, variant = 'app', ...props }: AppFrameProps) => (
  <div className="relative z-10 flex h-dvh w-full" {...props}>
    {/* Backdrop for the status bar, which overlays the page in the Home Screen web app. */}
    <div
      aria-hidden={true}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background/95 backdrop-blur-sm"
    />
    <Sidebar activeHref={activeHref} variant={variant} />
    <div className="flex h-full w-full flex-col overflow-hidden">
      <main className="relative flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain bg-main-content px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-8 lg:pb-8">
        <div className="mx-auto min-h-full w-full max-w-295">
          {/* A reader has its own top bar and no command palette. */}
          {variant === 'app' && <MobileHeader />}
          {children}
        </div>
      </main>
      {variant === 'app' && <BottomNav activeHref={activeHref} />}
    </div>
  </div>
);

/**
 * The layout of the `_auth` routes. A signed-out reader of a public page gets no onboarding
 * dialogs: they start at the login, without a remount of the page.
 */
export const MainLayout = ({
  children,
  variant = 'app',
}: {
  children: ReactNode;
  variant?: 'app' | 'reader';
}) => (
  <AppFrame data-testid="main-layout" variant={variant}>
    {variant === 'app' && <WelcomeModal />}
    {variant === 'app' && <NewFeatureModal />}
    {children}
  </AppFrame>
);
