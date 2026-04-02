import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@components/button';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { firstComponentFromStack } from '@utils/error';
import i18n from '@/i18n/config';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const component = firstComponentFromStack(errorInfo.componentStack ?? '');

    analytics.event(AnalyticsEvent.FrontendError, {
      error_type: error.name,
      component,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
          <div className="px-4 py-10 sm:p-12">
            <img
              src="/governance-logo.svg"
              alt={i18n.t(($) => $.common.alt.icpLogo)}
              className="h-6 w-fit dark:invert"
            />
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="flex max-w-md flex-col items-center text-center">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {i18n.t(($) => $.errors.errorBoundary.title)}
                </h2>
                <p className="text-muted-foreground">
                  {i18n.t(($) => $.errors.errorBoundary.description)}
                </p>
              </div>
              <div className="mt-8">
                <Button size="lg" onClick={() => (window.location.href = '/dashboard')}>
                  {i18n.t(($) => $.errors.errorBoundary.tryAgain)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
